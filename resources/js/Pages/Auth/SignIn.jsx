import { router, Head } from "@inertiajs/react";
import { useState } from "react";

export default function SignIn({ shopId, onResetTerminal }) {
    const [pin, setPin] = useState("");
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});

    const handleNumberPress = (num) => {
        if (pin.length < 4 && !processing) {
            const nextPin = pin + num;
            setPin(nextPin);

            // Once exactly 4 digits are reached, fire the submission immediately
            if (nextPin.length === 4) {
                setProcessing(true);
                setErrors({});

                router.post(
                    route("login"),
                    {
                        pin: nextPin,
                        shop_id: shopId,
                    },
                    {
                        onFinish: () => setProcessing(false),
                        onError: (backendErrors) => {
                            setErrors(backendErrors);
                            setPin(""); // Reset the dots on failure so they can try again
                        },
                    },
                );
            }
        }
    };

    const handleClear = () => {
        if (!processing) {
            setPin("");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
            <Head title="Staff Sign-In" />

            <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl border border-gray-200 flex flex-col items-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Staff Sign-In
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    Enter your 4-digit terminal access code
                </p>

                {/* Masked PIN Dot Indicators */}
                <div className="flex gap-4 mb-8">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full border-2 border-indigo-600 transition-all duration-150 ${
                                pin.length > i
                                    ? "bg-indigo-600 scale-110"
                                    : "bg-transparent"
                            }`}
                        />
                    ))}
                </div>

                {/* Render any validation errors cleanly */}
                {Object.keys(errors).length > 0 && (
                    <div className="text-sm text-red-600 font-semibold mb-4 bg-red-50 px-4 py-2 rounded-lg w-full text-center space-y-1">
                        {Object.values(errors).map((error, idx) => (
                            <p key={idx}>{error}</p>
                        ))}
                    </div>
                )}

                {/* Keyboard Grid Layout */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            type="button"
                            disabled={processing}
                            onClick={() => handleNumberPress(num.toString())}
                            className="h-16 text-xl font-bold bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-full flex items-center justify-center active:scale-95 transition-transform border border-gray-200 disabled:opacity-50"
                        >
                            {num}
                        </button>
                    ))}

                    <button
                        type="button"
                        disabled={processing}
                        onClick={handleClear}
                        className="h-16 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-full flex items-center justify-center disabled:opacity-50"
                    >
                        Clear
                    </button>

                    <button
                        type="button"
                        disabled={processing}
                        onClick={() => handleNumberPress("0")}
                        className="h-16 text-xl font-bold bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-full flex items-center justify-center border border-gray-200 disabled:opacity-50"
                    >
                        0
                    </button>

                    <button
                        type="button"
                        disabled={processing}
                        onClick={onResetTerminal}
                        className="h-16 text-xs font-semibold text-gray-400 hover:text-gray-600 rounded-full flex items-center justify-center text-center leading-tight disabled:opacity-50"
                    >
                        Reset Terminal
                    </button>
                </div>
            </div>
        </div>
    );
}
