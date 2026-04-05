import { useEffect, useRef } from 'react';

/**
 * A hook that pushes a state to the browser history when 'isOpen' is true.
 * If the user uses the system back button/gesture, the state is popped
 * and 'onClose' is called to close the modal/overlay.
 * 
 * It also cleanup the history state if the modal is closed via UI button.
 */
export function useBackHandler(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    // Use a unique ID or label for this modal instance
    const modalStateId = 'modal-open-' + Math.random().toString(36).substring(2, 9);
    
    // Push a dummy state to history
    window.history.pushState({ modalId: modalStateId }, "");

    const handlePopState = (event: PopStateEvent) => {
      // If the current history state is NOT our state, it means we must have been popped.
      if (window.history.state?.modalId !== modalStateId) {
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      
      // We only want to pop if we are still at the top and the component/modal is truly closing
      if (window.history.state?.modalId === modalStateId) {
        window.history.back();
      }
    };
  }, [isOpen]); // Only re-run when visibility actually toggles
}
