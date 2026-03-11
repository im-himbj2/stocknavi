import React, { createContext, useContext, useState } from 'react'

const BullModeContext = createContext({ bullMode: false, toggleBullMode: () => {} })

export function BullModeProvider({ children }) {
  const [bullMode, setBullMode] = useState(false)
  const toggleBullMode = () => setBullMode(v => !v)
  return (
    <BullModeContext.Provider value={{ bullMode, toggleBullMode }}>
      {children}
    </BullModeContext.Provider>
  )
}

export function useBullMode() {
  return useContext(BullModeContext)
}
