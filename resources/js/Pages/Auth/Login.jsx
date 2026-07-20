import { useEffect, useState } from "react";
import Checkbox from "@/Components/Checkbox";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import GuestLayout from "@/Layouts/GuestLayout";
import { Head, Link, useForm } from "@inertiajs/react";
import SignIn from "./SignIn";
import { clearUsersLocal } from "@/Utils/db";

export default function Login({ status, canResetPassword }) {
    const [terminalShopId, setTerminalShopId] = useState(null);
    const [isTerminalMode, setIsTerminalMode] = useState(false);

    // Check terminal storage on mount
    useEffect(() => {
        const storedShopId = localStorage.getItem("terminal_shop_id");
        if (storedShopId) {
            setTerminalShopId(storedShopId);
            setIsTerminalMode(true);
        }
    }, []);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: "",
        password: "",
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route("login"), {
            onFinish: () => reset("password"),
        });
    };

    const handleResetTerminal = async () => {
        // 1. Clear Terminal IDs from LocalStorage
        localStorage.removeItem("terminal_shop_id");
        localStorage.removeItem("terminal_shop_type");
        localStorage.removeItem("terminal_shift_id");

        // 2. Clear only the user cache
        await clearUsersLocal();

        // 3. Reset UI State
        setTerminalShopId(null);
        setIsTerminalMode(false);

        // 4. Force reload
        window.location.reload();
    };
    // If terminal shop_id is detected locally, swap out for the PIN entry pad layout
    if (isTerminalMode) {
        return (
            <SignIn
                shopId={terminalShopId}
                onResetTerminal={handleResetTerminal}
            />
        );
    }

    // Otherwise, render your original Email/Password form layout exactly as it was
    return (
        <GuestLayout>
            <Head title="Log in" />

            {status && (
                <div className="mb-4 text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData("email", e.target.value)}
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Password" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="current-password"
                        onChange={(e) => setData("password", e.target.value)}
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4 block">
                    <label className="flex items-center">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData("remember", e.target.checked)
                            }
                        />
                        <span className="ms-2 text-sm text-gray-600">
                            Remember me
                        </span>
                    </label>
                </div>

                <div className="mt-4 flex items-center justify-end">
                    {canResetPassword && (
                        <Link
                            href={route("password.request")}
                            className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            Forgot your password?
                        </Link>
                    )}

                    <PrimaryButton className="ms-4" disabled={processing}>
                        Log in
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
