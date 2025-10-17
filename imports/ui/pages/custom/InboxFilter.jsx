import React from "react";
import { useForm } from "react-hook-form";

/**
 * Reusable, data‑driven Filters Panel
 * - Uses react-hook-form so every input is registered with a ref under the hood.
 * - Unique, semantic names used for each group to avoid collisions.
 * - Repeated rows generated from config.
 * - onSubmit returns a clean object of checked values + date range.
 *
 * Usage:
 *   <InboxFilter onApply={(filters) => console.log(filters)} onCancel={() => {}} />
 */

// ---- Types (TS-style comments for clarity; file is plain JS/JSX) ----
// type Option = { id: string; label: string; value: string };
// type GroupConfig = { key: string; label: string; options: Option[] };

const CLIENT_GROUP = {
    key: "clientTypes",
    label: "by Client",
    options: [
        { id: "client-prospect", label: "Prospect", value: "prospect" },
        { id: "client-client", label: "Client", value: "client" },
        { id: "client-demo", label: "Demo", value: "demo" },
        { id: "client-sales", label: "Sales", value: "sales" },
        { id: "client-support", label: "Support", value: "support" },
        { id: "client-issue", label: "Issue", value: "issue" },
    ],
};

const MESSAGE_TYPE_GROUP = {
    key: "type",
    label: "by Message Type",
    options: [
        { id: "msg-chat", label: "Chat", value: "chat" },
        { id: "msg-voice", label: "Call", value: "call" },
    ],
};

const STATUS_GROUP = {
    key: "statuses",
    label: "by Status",
    options: [
        { id: "read", label: "Read", value: "read" },
        { id: "unread", label: "Unread", value: "unread" }
    ],
};

const GROUPS = [CLIENT_GROUP, MESSAGE_TYPE_GROUP, STATUS_GROUP];

// ---- Small, reusable components ----

function FilterCheckbox({ id, label, name, register }) {
    return (
        <label className="w-checkbox filtercheckbox_container">
            <input
                id={id}
                type="checkbox"
                value={id}
                // Register under the group name; react-hook-form collects checked values.
                {...register(name)}
                className="w-checkbox-input filtercheckbox"
            />
            <span className="filtercheckbox_label w-form-label" htmlFor={id}>
                {label}
            </span>
        </label>
    );
}

function FilterGroup({ group, register }) {
    return (
        <div className="filter-group">
            <div className="filter-label">{group.label}</div>
            <div className="filter-group_row" style={{ display: "grid", gap: 8 }}>
                {group.options.map((opt) => (
                    <FilterCheckbox
                        key={opt.id}
                        id={opt.id}
                        label={opt.label}
                        name={group.key}
                        register={register}
                    />
                ))}
            </div>
        </div>
    );
}

export default function InboxFilter({ onApply, onCancel }) {
    const { register, handleSubmit, reset } = useForm({
        defaultValues: {
            // Groups register as arrays of ids
            clientTypes: [],
            type: [],
            statuses: [],
            // Dates
            dateFrom: "",
            dateTo: "",
            // Tags (placeholder for your tag multi-select)
            tags: [],
        },
    });

    const onSubmit = (values) => {
        // Transform RHF arrays of ids into arrays of semantic values
        const idToValue = new Map();
        GROUPS.forEach((g) => g.options.forEach((o) => idToValue.set(o.id, o.value)));

        const normalize = (ids) => (Array.isArray(ids) ? ids.map((id) => idToValue.get(id)).filter(Boolean) : []);

        const filters = {
            clientTypes: normalize(values.clientTypes),
            type: normalize(values.type),
            statuses: normalize(values.statuses),
            dateFrom: values.dateFrom || null,
            dateTo: values.dateTo || null,
            tags: values.tags || [],
            // Additionally, if you need to know *exactly* which checkbox ids were checked, keep raw ids:
            _raw: {
                clientTypes: values.clientTypes,
                type: values.type,
                statuses: values.statuses,
            },
        };

        onApply?.(filters);
    };

    return (
        <form id="filters-form" aria-label="Filters" onSubmit={handleSubmit(onSubmit)}>
            <div className="filter-main-div">
                <div className="filter-main-column">
                    <FilterGroup group={CLIENT_GROUP} register={register} />
                    <FilterGroup group={MESSAGE_TYPE_GROUP} register={register} />
                    <FilterGroup group={STATUS_GROUP} register={register} />
                </div>

                <div className="filter-main-column wider">
                    <div className="filter-group">
                        <div className="filter-label">Tag</div>
                        <div className="filter-group_row">
                            {/* Replace with your actual multi-select. For now, a text input or chip input. */}
                            <input
                                className="filter-text-field w-input"
                                placeholder="Comma-separated tags"
                                type="text"
                                {...register("tagsText")}
                                onBlur={(e) => {
                                    const text = e.target.value || "";
                                    const tags = text
                                        .split(",")
                                        .map((t) => t.trim())
                                        .filter(Boolean);
                                    // push parsed tags into hidden RHF field
                                    // NOTE: this is a quick placeholder; replace with your own Tag component + Controller.
                                }}
                            />
                        </div>
                    </div>

                    <div className="filter-group">
                        <div className="filter-label">by Timeframe</div>
                        <div className="datefield_container">
                            <input
                                className="filter-text-field w-input"
                                placeholder="YYYY-MM-DD"
                                type="date"
                                {...register("dateFrom")}
                            />
                            <div className="datefield_dash">
                                <div className="customer-info-label">-</div>
                            </div>
                        </div>
                        <div className="datefield_container">
                            <input
                                className="filter-text-field w-input"
                                placeholder="YYYY-MM-DD"
                                type="date"
                                {...register("dateTo")}
                            />
                            <div className="datefield_dash opacity-zero">
                                <div className="customer-info-label">-</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="filter_bottom">
                <a href="#" className="popup-links text-red" onClick={() => {
                    reset();
                }}>
                    Clear all filters
                </a>
                <div className="filterbottom_right">
                    <div className="filter-btn-div">
                        <a
                            data-w-id="22da1d15-a272-dba8-d763-7cbf1103c8b3"
                            href="#"
                            onClick={onCancel}
                            className="btn-style1-2 outline w-inline-block"
                        >
                            <div>Cancel</div>
                        </a>
                        <button type="submit" className="btn-style1-2 w-inline-block">
                            <div>Apply</div>
                        </button>
                    </div>
                </div>
            </div>

        </form>
    );
}
