"use client";

import { useStore } from "@/lib/store";
import OfficeFloorPlan from "@/components/OfficeFloorPlan";
import InspectorPanel from "@/components/InspectorPanel";

export default function DashboardHome() {
    const { selectedId } = useStore();

    return (
        <div className="h-full flex">
            {/* Floor plan */}
            <div className="flex-1 overflow-auto p-4 lg:p-6">
                <OfficeFloorPlan />
            </div>

            {/* Inspector sidebar (desktop) */}
            {selectedId && (
                <aside className="hidden md:block w-80 lg:w-[22rem] border-l border-neutral-800/50 overflow-y-auto">
                    <InspectorPanel key={selectedId} />
                </aside>
            )}
        </div>
    );
}
