"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { MotionConfig, useReducedMotion } from "motion/react";
const Context = createContext({
  active: false,
  paused: false,
  toggle: () => {},
});
export const useSceneMotion = () => useContext(Context);
export function SceneMotion({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <Context.Provider
      value={{
        active: ready && !reduced && !paused,
        paused,
        toggle: () => setPaused((v) => !v),
      }}
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </Context.Provider>
  );
}
