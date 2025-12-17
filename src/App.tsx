import { useState, useEffect, useCallback, useRef } from 'react'
import { ref, set } from 'firebase/database'
import { db } from './firebase'
import { NicknameModal } from './components/NicknameModal'
import { Leaderboard } from './components/Leaderboard'
import './App.css'


const SCORE_KEY = 'popjangScore'
const NICKNAME_KEY = 'popjangNickname'
const USER_ID_KEY = 'popjangUserId'
const SOUND_PATHS = [
  '/assets/pop1.mp3',
  '/assets/pop2.mp3',
  '/assets/pop3.mp3',
  '/assets/pop4.mp3',
]

function App() {
  const [score, setScore] = useState(() => {
    const saved = localStorage.getItem(SCORE_KEY)
    return saved ? parseInt(saved, 10) : 0
  })
  const [isPopped, setIsPopped] = useState(false)
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem(NICKNAME_KEY) || ''
  })
  const [showNicknameModal, setShowNicknameModal] = useState(() => {
    return !localStorage.getItem(NICKNAME_KEY)
  })
  
  const soundIndexRef = useRef(0)
  const audioPoolRef = useRef<HTMLAudioElement[]>([])
  const scoreUpdateTimeoutRef = useRef<any>(null)
  const lastUpdateTimeRef = useRef<number>(0)

  useEffect(() => {
    // Initialize audio pool
    audioPoolRef.current = SOUND_PATHS.map(path => {
      const audio = new Audio(path)
      audio.preload = 'auto'
      return audio
    })

    // Generate or retrieve user ID
    let userId = localStorage.getItem(USER_ID_KEY)
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem(USER_ID_KEY, userId)
    }

    // Preload images
    const img1 = new Image()
    img1.src = '/assets/pop.jpeg'
    const img2 = new Image()
    img2.src = '/assets/unpop.jpeg'
  }, [])

  const updateFirebaseScore = async (currentScore: number) => {
    const userId = localStorage.getItem(USER_ID_KEY)
    if (userId) {
      try {
        await set(ref(db, 'leaderboard/' + userId), {
          nickname,
          score: currentScore,
          updatedAt: new Date().toISOString()
        })
      } catch (error) {
        console.error("Error updating score:", error)
      }
    }
  }

  // Throttled & Debounced score update to Firebase
  useEffect(() => {
    localStorage.setItem(SCORE_KEY, score.toString())

    if (nickname && score > 0) {
      const now = Date.now()

      // Throttle: Update every 0.5 seconds during rapid clicking
      if (now - lastUpdateTimeRef.current >= 500) {
        updateFirebaseScore(score)
        lastUpdateTimeRef.current = now
      }

      // Debounce: Ensure final score is saved when clicking stops
      if (scoreUpdateTimeoutRef.current) {
        clearTimeout(scoreUpdateTimeoutRef.current)
      }

      scoreUpdateTimeoutRef.current = setTimeout(() => {
        updateFirebaseScore(score)
        lastUpdateTimeRef.current = Date.now()
      }, 1000)
    }
  }, [score, nickname])

  const handleNicknameSubmit = (newNickname: string) => {
    setNickname(newNickname)
    localStorage.setItem(NICKNAME_KEY, newNickname)
    setShowNicknameModal(false)
  }

  const pop = useCallback(() => {
    if (showNicknameModal) return

    setIsPopped(true)
    
    const audio = audioPoolRef.current[soundIndexRef.current]
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(e => console.error("Audio play failed", e))
    }
    
    soundIndexRef.current = (soundIndexRef.current + 1) % SOUND_PATHS.length
    
    setScore((prev) => prev + 1)
  }, [showNicknameModal])

  const unPop = useCallback(() => {
    setIsPopped(false)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.repeat) pop()
    }
    const handleKeyUp = () => unPop()

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    const handlePointerDown = () => pop()
    const handlePointerUp = () => unPop()

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('pointerup', handlePointerUp)
    }
  }, [pop, unPop])

  return (
    <div className="container">
      {showNicknameModal && <NicknameModal onSubmit={handleNicknameSubmit} />}
      <p className="subtitle">명견만리</p>
      <h1>POPJANG</h1>
      {nickname && <p className="nickname">당신의 닉네임: {nickname}</p>}
      <p className="score">{score}</p>
      <img
        src={isPopped ? '/assets/pop.jpeg' : '/assets/unpop.jpeg'}
        className="minjang"
        alt="Picture of Minjang Kim"
        draggable={false}
      />
      <Leaderboard myScore={score} myNickname={nickname} />
    </div>
  )
}

export default App
