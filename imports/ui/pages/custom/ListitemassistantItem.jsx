import React, { useRef } from 'react';
import AssistantWatcher from '../../../api/client/watchers/vapi/AssistantWatcher';
import { useWatcher } from '../../../api/client/Watcher2';
import { ASSISTANT } from '../../../api/common/assistantConst';
// Component: ListitemassistantItem
// Type: repetition
// Props: ["textDiv"]

const ListitemassistantItem = ({ assistant = {}, onClick = () => { } }) => {
  const watcher = useRef(AssistantWatcher).current;
  useWatcher(watcher);

  return (
    <div className="list-item-assistant" tmq="cmp-list-item-assistant" onClick={() => {
      watcher.setValue(ASSISTANT.SELECTED_ASSISTANT, assistant);
      watcher.setSession();
      onClick();
    }}>
      <div>{assistant.name ? assistant.name : "No Name Assistant"}</div>
    </div>
  );
};

export default ListitemassistantItem;