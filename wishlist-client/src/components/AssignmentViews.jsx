// Helper components for the two views
function ReceiversView({ assignments, users }) {
    // Group assignments by receiver
    const receiverGroups = {};

    assignments.forEach(assignment => {
        const receiverId = assignment.receiverId;
        if (!receiverGroups[receiverId]) {
            receiverGroups[receiverId] = {
                receiver: assignment.receiver,
                santa: null,
                elves: []
            };
        }

        if (assignment.role === 'santa') {
            receiverGroups[receiverId].santa = assignment.giver;
        } else {
            receiverGroups[receiverId].elves.push(assignment.giver);
        }
    });

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Receiver</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Santa</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Elves</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {Object.values(receiverGroups).map((group) => (
                        <tr key={group.receiver.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                                        {group.receiver.name[0]}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900">{group.receiver.name}</div>
                                        <div className="text-xs text-slate-500">{group.receiver.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                {group.santa ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🎅</span>
                                        <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                                            {group.santa.name[0]}
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">{group.santa.name}</span>
                                    </div>
                                ) : (
                                    <span className="text-slate-400 text-sm">None</span>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                {group.elves.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {group.elves.map((elf) => (
                                            <div key={elf.id} className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                                                <span className="text-sm">🧝</span>
                                                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                                                    {elf.name[0]}
                                                </div>
                                                <span className="text-xs font-medium text-slate-700">{elf.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-slate-400 text-sm">None</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function GiversView({ assignments, users }) {
    // Group assignments by giver
    const giverGroups = {};

    assignments.forEach(assignment => {
        const giverId = assignment.giverId;
        if (!giverGroups[giverId]) {
            giverGroups[giverId] = {
                giver: assignment.giver,
                santa: null,
                elves: []
            };
        }

        if (assignment.role === 'santa') {
            giverGroups[giverId].santa = assignment.receiver;
        } else {
            giverGroups[giverId].elves.push(assignment.receiver);
        }
    });

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Giver</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Santa For</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Elf For</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {Object.values(giverGroups).map((group) => (
                        <tr key={group.giver.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                                        {group.giver.name[0]}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900">{group.giver.name}</div>
                                        <div className="text-xs text-slate-500">{group.giver.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                {group.santa ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🎅</span>
                                        <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                                            {group.santa.name[0]}
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">{group.santa.name}</span>
                                    </div>
                                ) : (
                                    <span className="text-slate-400 text-sm">None</span>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                {group.elves.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {group.elves.map((elf) => (
                                            <div key={elf.id} className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                                                <span className="text-sm">🧝</span>
                                                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                                                    {elf.name[0]}
                                                </div>
                                                <span className="text-xs font-medium text-slate-700">{elf.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-slate-400 text-sm">None</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export { ReceiversView, GiversView };
