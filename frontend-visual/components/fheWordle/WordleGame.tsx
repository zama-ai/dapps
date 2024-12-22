import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const WORDS = ["REACT", "NEXTJ", "VERCEL", "TAILW", "STYLE"];

export default function WordleGame() {
  const [targetWord, setTargetWord] = useState("");
  const [currentGuess, setCurrentGuess] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string[][]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setTargetWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
  }, []);

  const handleGuess = () => {
    if (currentGuess.length !== WORD_LENGTH) {
      setMessage("Please enter a 5-letter word");
      return;
    }

    const newFeedback = currentGuess.split("").map((letter, index) => {
      if (letter === targetWord[index]) return "correct";
      if (targetWord.includes(letter)) return "present";
      return "absent";
    });

    setGuesses([...guesses, currentGuess]);
    setFeedback([...feedback, newFeedback]);
    setCurrentGuess("");

    if (currentGuess === targetWord) {
      setGameOver(true);
      setMessage("Congratulations! You guessed the word!");
    } else if (guesses.length + 1 === MAX_GUESSES) {
      setGameOver(true);
      setMessage(`Game over! The word was ${targetWord}`);
    }
  };

  const renderGuess = (guess: string, feedbackRow: string[]) => {
    return guess.split("").map((letter, index) => (
      <div
        key={index}
        className={`w-12 h-12 border-2 flex items-center justify-center text-2xl font-bold
          ${
            feedbackRow[index] === "correct"
              ? "bg-green-500 border-green-600"
              : feedbackRow[index] === "present"
              ? "bg-yellow-500 border-yellow-600"
              : "bg-gray-300 border-gray-400"
          }`}
      >
        {letter}
      </div>
    ));
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="space-y-2 mb-4">
        {guesses.map((guess, i) => (
          <div key={i} className="flex space-x-2">
            {renderGuess(guess, feedback[i])}
          </div>
        ))}
      </div>
      {!gameOver && (
        <div className="flex space-x-2 mb-4">
          <Input
            type="text"
            value={currentGuess}
            onChange={(e) => setCurrentGuess(e.target.value.toUpperCase())}
            maxLength={WORD_LENGTH}
            className="w-40 text-center text-2xl uppercase"
            disabled={gameOver}
          />
          <Button onClick={handleGuess} disabled={gameOver}>
            Guess
          </Button>
        </div>
      )}
      {message && (
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="h-5 w-5" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
