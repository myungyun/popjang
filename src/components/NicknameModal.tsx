import { useState } from 'react';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '../firebase';
import './NicknameModal.css';

interface NicknameModalProps {
  onSubmit: (nickname: string) => void;
}

export function NicknameModal({ onSubmit }: NicknameModalProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const validateNickname = (name: string) => {
    if (name.length < 1 || name.length > 10) {
      return '닉네임은 1자 이상 10자 이하여야 해요.';
    }
    if (!/^[ㄱ-힣a-zA-Z0-9]+$/.test(name)) {
      return '한글, 영문, 숫자만 사용할 수 있어요.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    
    const validationError = validateNickname(trimmedInput);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      const leaderboardRef = ref(db, 'leaderboard');
      const nicknameQuery = query(leaderboardRef, orderByChild('nickname'), equalTo(trimmedInput));
      const snapshot = await get(nicknameQuery);

      if (snapshot.exists()) {
        setError('이미 사용 중인 닉네임이에요.');
      } else {
        onSubmit(trimmedInput);
      }
    } catch (err) {
      console.log(err);
      setError('닉네임 확인 중 오류가 발생했어요.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>닉네임을 입력해주세요</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError('');
            }}
            placeholder="닉네임 (한글, 영문, 숫자 1~10자)"
            maxLength={10}
            autoFocus
            disabled={isChecking}
          />
          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={isChecking}>
            {isChecking ? '확인 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
}

