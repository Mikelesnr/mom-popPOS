import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

export default function AuditCharts({ shifts }) {
    // Transform raw shift data into graph-ready format
    const chartData = shifts.map((shift) => ({
        name: shift.user.name, // Accessing staff name
        sales: parseFloat(shift.blind_cash_reported || 0),
    }));

    return (
        <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sales" fill="#8884d8" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
