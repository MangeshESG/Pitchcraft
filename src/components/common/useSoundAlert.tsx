import { useRef, useEffect } from "react";
import notificationSound from "../../assets/sound/notification.mp3";

export const useSoundAlert = (soundUrl?: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const src = soundUrl || notificationSound;
    const audio = new Audio(src);
    audio.preload = "auto";
    audioRef.current = audio;
  }, [soundUrl]);

  const playSound = async () => {
    if (!audioRef.current) return;

    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch (err) {
      console.warn("Sound playback blocked:", err);
    }
  };

  return { playSound };
};
