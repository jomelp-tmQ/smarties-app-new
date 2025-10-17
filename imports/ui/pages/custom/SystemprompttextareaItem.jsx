import React from 'react';

const SystemprompttextareaItem = ({ id, name, dataName, placeholder, value, onChange = () => { } }) => {
  return (
    <div className={'system-prompt-textarea'}>
      <div className={'form-textararea-div'}>
        <textarea
          id={id || 'System-Prompt'}
          name={name || 'System-Prompt'}
          maxlength={'5000'}
          data-name={dataName || 'System Prompt'}
          placeholder={
            placeholder ||
            "Welcome, Leo! You are the friendly and helpful voice of SmartHome Innovations, here to assist customers with their smart home devices. Your main task is to provide support through audio interactions, answering questions, troubleshooting problems, offering advice, and making product recommendations. Remember, customers can't see you, so your words need to paint the picture clearly and warmly."
          }
          className={'form-input-textarea w-input'}
          value={value}
          onChange={onChange}
        ></textarea>
      </div>
    </div>
  );
};

export default SystemprompttextareaItem;
