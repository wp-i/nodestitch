!macro NSIS_HOOK_POSTINSTALL
  ; The desktop shortcut is the user's direct relaunch path. Point its icon at
  ; a versioned resource so Explorer does not reuse a stale executable icon.
  SetShellVarContext current
  Delete "$INSTDIR\nodestitch-mark-202608.ico"
  Delete "$INSTDIR\nodestitch-timeline-dffef515.ico"
  Delete "$DESKTOP\${PRODUCTNAME}.lnk"
  ClearErrors
  DetailPrint "Creating desktop shortcut: $DESKTOP\${PRODUCTNAME}.lnk"
  CreateShortcut "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe" "" "$INSTDIR\nodestitch-timeline-3a95f3df.ico" 0 SW_SHOWNORMAL "" "${PRODUCTNAME}"
  ${If} ${Errors}
    Abort "Unable to create the required desktop shortcut."
  ${EndIf}
  ${IfNot} ${FileExists} "$DESKTOP\${PRODUCTNAME}.lnk"
    Abort "The required desktop shortcut was not created."
  ${EndIf}
  !insertmacro SetLnkAppUserModelId "$DESKTOP\${PRODUCTNAME}.lnk"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  SetShellVarContext current
  Delete "$DESKTOP\${PRODUCTNAME}.lnk"
  Delete "$INSTDIR\nodestitch-mark-202608.ico"
  Delete "$INSTDIR\nodestitch-timeline-dffef515.ico"
!macroend
