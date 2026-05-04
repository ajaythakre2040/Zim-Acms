import { useEffect, useState, useMemo, Fragment } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit3, Loader2, ShieldCheck, LayoutGrid, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RolePermissionViewPage() {
    const { id } = useParams();
    const [, navigate] = useLocation();

    const [form, setForm] = useState({
        roleName: "",
        code: "",
        description: "",
        isActive: true,
    });

    const [permissions, setPermissions] = useState<any>({});
    const permissionTypes = ["view", "add", "edit", "delete", "print", "export"];

    // ✅ Fetch Menus
    const { data: menus = [] } = useQuery({
        queryKey: ["menus"],
        queryFn: async () => {
            const res = await fetch("/api/menus");
            return res.json();
        },
    });

    // ✅ Fetch Role Data
    const { isLoading } = useQuery({
        queryKey: ["role-view", id],
        queryFn: async () => {
            const res = await fetch(`/api/roles-with-permissions/${id}`);
            const data = await res.json();

            setForm({
                roleName: data.roleName || "",
                code: data.code || "",
                description: data.description || "",
                isActive: data.isActive ?? true,
            });

            const permMap: any = {};
            if (data.permissions) {
                data.permissions.forEach((p: any) => {
                    permMap[p.menuId] = {
                        view: !!p.view, add: !!p.add, edit: !!p.edit,
                        delete: !!p.delete, print: !!p.print, export: !!p.export,
                    };
                });
            }
            setPermissions(permMap);
            return data;
        },
        enabled: !!id,
    });

    const groupedMenus = useMemo(() => {
        return menus.map((parent: any) => ({
            ...parent,
            children: parent.subMenus || [],
        }));
    }, [menus]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-green-600 w-12 h-12" />
                    <p className="text-slate-400 font-medium animate-pulse">Fetching details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 font-sans">
            <div className="max-w-[1400px] mx-auto space-y-6">

                {/* --- TOP HEADER --- */}
                <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate("/master-data/roles")}
                            className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="font-medium">Back to Roles</span>
                        </Button>
                        <div className="h-6 w-[1px] bg-slate-200" />
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Role Details</h1>
                            <p className="text-[11px] text-slate-400 font-medium">Review system access and privilege mapping</p>
                        </div>
                    </div>

                    <Button
                        onClick={() => navigate(`/master-data/roles/edit/${id}`)}
                        className="bg-slate-900 hover:bg-slate-800 text-white gap-2 px-6 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-slate-200"
                    >
                        <Edit3 className="w-4 h-4" /> Edit Configuration
                    </Button>
                </div>

                {/* --- BASIC INFO CARD --- */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-green-600" />
                        <h2 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Basic Information</h2>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Role Name</label>
                                <div className="text-sm text-slate-700 font-bold bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                                    {form.roleName}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Role Code</label>
                                <div className="text-sm text-slate-700 font-bold bg-slate-50 p-3.5 rounded-xl border border-slate-100 font-mono">
                                    {form.code}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Status</label>
                                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 w-fit pr-8">
                                    <div className={`w-2 h-2 rounded-full ${form.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                    <span className={`text-[10px] font-black uppercase ${form.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                        {form.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Description</label>
                            <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[80px] leading-relaxed italic">
                                {form.description || "No specific description provided for this role."}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- PERMISSIONS TABLE --- */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-blue-600" />
                            <h2 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Access Matrix</h2>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium italic">
                            <Info className="w-3 h-3" /> Enabled permissions are highlighted
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead className="sticky top-0 z-20">
                                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 shadow-sm">
                                    <th className="p-4 pl-6 w-[20%]">Parent Module</th>
                                    <th className="p-4 w-[20%]">Sub Module</th>
                                    {permissionTypes.map(type => (
                                        <th key={type} className="p-4 text-center">
                                            <div className="bg-white py-1.5 px-3 rounded-lg border border-slate-200 inline-block min-w-[70px]">
                                                {type}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {groupedMenus.map((parent: any) => (
                                    <Fragment key={parent.id}>
                                        {/* Parent Row */}
                                        <tr className="bg-white group">
                                            <td className="p-4 pl-6 font-bold text-slate-800 text-[13px] flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                {parent.title}
                                            </td>
                                            <td className="p-4 text-center text-slate-200">—</td>
                                            {permissionTypes.map(type => (
                                                <td key={type} className="p-4 text-center">
                                                    {permissions?.[parent.id]?.[type] ? (
                                                        <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center mx-auto shadow-md shadow-green-100">
                                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    ) : (
                                                        <div className="w-5 h-5 border-2 border-slate-100 rounded-lg bg-slate-50/30 mx-auto" />
                                                    )}
                                                </td>
                                            ))}
                                        </tr>

                                        {/* Children Rows */}
                                        {parent.children.map((child: any) => (
                                            <tr key={child.id} className="hover:bg-blue-50/20 transition-all group border-b border-slate-50">
                                                <td className="p-4 border-r-0"></td>
                                                <td className="p-4 text-[12px] text-slate-500 font-medium pl-10 group-hover:text-blue-600 transition-colors">
                                                    {child.title}
                                                </td>
                                                {permissionTypes.map(type => (
                                                    <td key={type} className="p-4 text-center">
                                                        {permissions?.[child.id]?.[type] ? (
                                                            <div className="w-5 h-5 bg-blue-500 rounded-lg flex items-center justify-center mx-auto shadow-md shadow-blue-50">
                                                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </div>
                                                        ) : (
                                                            <div className="w-4 h-4 border border-slate-100 rounded-md bg-slate-50/50 mx-auto" />
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}