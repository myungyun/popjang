import { useEffect, useState, useRef } from 'react';
import { ref, query, orderByChild, limitToLast, onValue } from 'firebase/database';
import { db } from '../firebase';
import './Leaderboard.css';

interface RankItem {
  id: string;
  nickname: string;
  score: number;
}

interface ScoreDiff {
  id: string;
  diff: number;
  uniqueId: string;
}

interface LeaderboardProps {
  myScore: number;
  myNickname: string;
}

export function Leaderboard({ myScore, myNickname }: LeaderboardProps) {
  const [rankings, setRankings] = useState<RankItem[]>([]);
  const [scoreDiffs, setScoreDiffs] = useState<ScoreDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const latestDataRef = useRef<RankItem[]>([]);
  
  const topRank = rankings.length > 0 ? rankings[0] : null;

  useEffect(() => {
    const leaderboardRef = ref(db, 'leaderboard');
    const q = query(leaderboardRef, orderByChild('score'), limitToLast(25));

    const unsubscribe = onValue(q, (snapshot) => {
      const items: RankItem[] = [];
      snapshot.forEach((childSnapshot) => {
        items.push({ id: childSnapshot.key!, ...childSnapshot.val() });
      });
      
      // Store latest data in ref
      latestDataRef.current = items.reverse();
      
      // Initial load
      setRankings(prev => {
        if (prev.length === 0) return latestDataRef.current;
        return prev;
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newRankings = latestDataRef.current;
      if (newRankings.length === 0) return;

      setRankings(prevRankings => {
        // Calculate differences
        const diffs: ScoreDiff[] = [];
        newRankings.forEach(newItem => {
          const prevItem = prevRankings.find(p => p.id === newItem.id);
          if (prevItem && newItem.score > prevItem.score) {
            diffs.push({
              id: newItem.id,
              diff: newItem.score - prevItem.score,
              uniqueId: `${newItem.id}-${Date.now()}-${Math.random()}`
            });
          }
        });
        
        if (diffs.length > 0) {
          setScoreDiffs(prev => [...prev, ...diffs]);
          // Clear diffs after animation
          setTimeout(() => {
            setScoreDiffs(prev => prev.filter(d => !diffs.some(newDiff => newDiff.uniqueId === d.uniqueId)));
          }, 1500);
        }
        
        // Simple check to avoid re-render if data hasn't changed
        if (JSON.stringify(prevRankings) === JSON.stringify(newRankings)) {
          return prevRankings;
        }
        
        return [...newRankings];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);



  return (
    <div 
      className={`leaderboard-container ${isExpanded ? 'expanded' : ''}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="leaderboard-header">
        <div className="header-top">
          <h2>TOP 25 랭킹</h2>
          <span className="toggle-icon mobile-only">{isExpanded ? '▼' : '▲'}</span>
        </div>
        <div className="mobile-summary mobile-only">
          <div className="summary-item">
            <span className="label">1위:</span>
            <div className="score-container">
              <span className="value">{topRank ? `${topRank.score.toLocaleString()}` : '-'}</span>
              {topRank && scoreDiffs.filter(d => d.id === topRank.id).map(diff => (
                <span key={diff.uniqueId} className="score-diff">
                  +{diff.diff.toLocaleString()}
                </span>
              ))}
            </div>
          </div>
          <div className="summary-item">
            <span className="label">나:</span>
            <span className="value">{myScore.toLocaleString()}</span>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="loading-message">로딩 중...</div>
      ) : (
        <ul className="ranking-list">
          {rankings.map((item, index) => {
            const userDiffs = scoreDiffs.filter(d => d.id === item.id);
            return (
              <li key={item.id} className={`rank-item rank-${index + 1}`}>
                <span className="rank-number">{index + 1}</span>
                <span className="rank-name">
                  {item.nickname}
                  {item.nickname === myNickname && <span className="me-badge"> (나)</span>}
                </span>
                <div className="score-container">
                  <span className="rank-score">{item.score.toLocaleString()}</span>
                  {userDiffs.map(diff => (
                    <span key={diff.uniqueId} className="score-diff">
                      +{diff.diff.toLocaleString()}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
