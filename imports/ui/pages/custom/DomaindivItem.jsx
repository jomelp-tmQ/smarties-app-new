import React, { useRef, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import WidgetWatcher from '../../../api/client/watchers/WidgetWatcher';
import { useWatcher } from '../../../api/client/Watcher2';
import Loader from './Loader';
import { toast } from 'sonner';
import { TOAST_STYLE } from '../../../api/common/const';
// Component: HeaderlistItem
// Type: repetition
// Props: ["name","dataName","id","name1","dataName1","id1"]

const DomaindivItem = ({ name, dataName, id, name1, dataName1, id1, index, isAddDomainOpen = false, onClick = () => { }, onClose, domain, isValid = false, handleDomainChange = () => { }, handleRemoveDomain = () => { }, isEditDomainOpen = false, onBlur = () => { }, isWebsiteVerifying = false }) => {
  const watcher = useRef(WidgetWatcher).current;
  useWatcher(watcher);
  const [isValidating, setIsValidating] = useState(false);

  const handleSave = async () => {
    const domainValue = domain.value || domain;
    if (!domainValue) {
      toast.error('Please enter a domain', {
        style: TOAST_STYLE.ERROR
      });
      return;
    }

    // If we're in edit mode, let the parent component handle validation and closing
    if (isEditDomainOpen) {
      onClick();
      return;
    }

    // For new domain creation, do validation here
    setIsValidating(true);
    try {
      const isValid = await watcher.checkDomain(domainValue);
      if (!isValid) {
        toast.error(`Invalid domain: ${domainValue}`, {
          style: TOAST_STYLE.ERROR
        });
        return;
      }
      onClick();
      onClose();
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div style={{ display: isAddDomainOpen ? "block" : "none" }} className="domain-div">
      <div className='form-row'>
        <div className="form-control" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <input value={domain.value} onChange={(e) => {
            handleDomainChange(index, 'value', e.target.value)
          }} className="form-input w-input" maxlength="256" name={name1 || "header-value-2"} data-name={dataName1 || "Header Value 2"} placeholder="Value" type="text" id={id1 || "header-value-2"}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            onBlur={onBlur}
          />
          {isWebsiteVerifying || isValidating ? <Loader size={12} text='Verifying...' /> : isValid ? <CheckCircle2 className="property-icon" size={20} color='green' /> : <XCircle className="property-icon" size={20} color='red' />}
          <div className="property-icon" onClick={() =>
            handleRemoveDomain(index)}>
            <img loading="lazy" src="../images/smarties-filetrash.svg" alt="" />
          </div>
        </div>
      </div>
      <div style={{ display: isEditDomainOpen ? "flex" : "none", cursor: "pointer" }} className="form-btn-container">
        <a className="btn-style1 outline" onClick={onClose}>
          <div>Cancel</div>
        </a>
        <a className="btn-style1 button" onClick={handleSave} style={{ cursor: "pointer" }}>
          <div>Save</div>
        </a>
      </div>
    </div>);
};

export default DomaindivItem;