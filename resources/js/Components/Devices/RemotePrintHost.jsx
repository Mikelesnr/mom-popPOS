import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import { useReactToPrint } from "react-to-print";
import { BillTemplate } from "@/Components/Sales/BillTemplate";
import { KitchenTicket } from "@/Components/Sales/KitchenTicket";
import { ReceiptTemplate } from "@/Components/Shared/ReceiptTemplate";

// Job templates other devices are allowed to ask this one to print.
const TEMPLATES = {
    bill: BillTemplate,
    receipt: ReceiptTemplate,
    kitchen: KitchenTicket,
};

/**
 * Renders print jobs (one at a time) and sends them to this device's browser
 * print dialog. Used for both jobs from other devices and this device's own
 * kitchen tickets. Mounted once by DeviceSyncProvider.
 */
export const RemotePrintHost = forwardRef(function RemotePrintHost(_, ref) {
    const [job, setJob] = useState(null);
    const queue = useRef([]);
    const current = useRef(null); // { job, resolve, reject }
    const printRef = useRef(null);

    const next = useCallback(() => {
        if (current.current || queue.current.length === 0) return;
        current.current = queue.current.shift();
        setJob(current.current.job);
    }, []);

    const finish = useCallback(
        (err) => {
            const cur = current.current;
            current.current = null;
            setJob(null);
            if (cur) (err ? cur.reject(err) : cur.resolve());
            next();
        },
        [next],
    );

    const print = useReactToPrint({
        contentRef: printRef,
        documentTitle: job?.title || "Print",
        onAfterPrint: () => finish(null),
        onPrintError: (_loc, error) =>
            finish(error instanceof Error ? error : new Error("Print failed")),
    });

    // Give the job a moment to render into the hidden node, then print it.
    useEffect(() => {
        if (!job) return;
        const t = setTimeout(() => print(), 80);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [job]);

    useImperativeHandle(
        ref,
        () => ({
            enqueue(incoming) {
                if (!incoming || !TEMPLATES[incoming.template]) {
                    return Promise.reject(new Error("Unknown print template"));
                }
                return new Promise((resolve, reject) => {
                    queue.current.push({ job: incoming, resolve, reject });
                    next();
                });
            },
        }),
        [next],
    );

    const Template = job ? TEMPLATES[job.template] : null;

    return (
        <div className="fixed -left-[9999px] top-0" aria-hidden="true">
            <div ref={printRef}>
                {Template && <Template {...(job.props || {})} />}
            </div>
        </div>
    );
});
