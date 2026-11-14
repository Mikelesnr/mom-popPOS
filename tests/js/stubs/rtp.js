import { useCallback } from "react";
export const printed = [];
// Behaves like react-to-print: reads the node, "prints" it, then fires onAfterPrint.
export function useReactToPrint({ contentRef, documentTitle, onAfterPrint }) {
    return useCallback(() => {
        printed.push({ title: documentTitle, html: contentRef.current?.innerHTML ?? "" });
        setTimeout(() => onAfterPrint?.(), 0);
    }, [contentRef, documentTitle, onAfterPrint]);
}
