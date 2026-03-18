import React from "react";
import StaffItem from "./StaffItem";

export default function StaffList({ staff, shopId }) {
    return (
        <div>
            <h3 className="font-medium">Staff</h3>
            <ul className="list-disc pl-5">
                {staff.length > 0 ? (
                    staff.map((user) => (
                        <StaffItem key={user.id} user={user} shopId={shopId} />
                    ))
                ) : (
                    <p className="text-gray-600">No staff yet.</p>
                )}
            </ul>
        </div>
    );
}
