import React from 'react';

// Component: Formrow2Item7
// Type: repetition
// Props: ["textLabel","id","name","dataName","value","textOption","textOption1"]

const Formrow2Itemkb = ({ textLabel, id, name, dataName, value = "", textOption, textOption1, options = [], onChange = () => { }, selection = "model" }) => {
    return (
        <div className="form-row-2">
            <div className="form--cell-div"><label htmlFor="" className="form-label-2">{textLabel || 'Provider'}</label>
                <div className="form-control-2">
                    <select id={id || "Provider"} name={name || "Provider"} data-name={dataName || "Provider"} className="select-field w-select" value={value} onChange={onChange}>
                        <option value="">Select an option</option>
                        {options.map((option, index) => {
                            return (
                                <option key={index} value={option.collectionid}>
                                    {option.collectionname}
                                </option>
                            );
                        }
                        )}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default Formrow2Itemkb;