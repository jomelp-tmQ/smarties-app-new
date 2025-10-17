import React, { useRef, useEffect, useState } from 'react';
import AssistantWatcher from '../../../api/client/watchers/vapi/AssistantWatcher';
import { useWatcher } from '../../../api/client/Watcher2';

const Chat = ({ isOpen = false, onClose = () => { } }) => {
    const watcher = useRef(AssistantWatcher).current;
    useWatcher(watcher);

    const [newMessage, setNewMessage] = useState("");

    const chats = watcher.getValue("chats") || [];
    const chatRef = useRef(null);
    const handleSendMessage = (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        const msg = (newMessage || '').trim();
        if (!msg) return;
        watcher.handleSendChat(msg);
        setNewMessage("");
    };
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [chats]); // Trigger scroll when new messages are added
    return (
        <>
            <div className="chat-main-top">
                <div className="text-assistant-name smaller">Assistant 1</div>
                <div
                    data-w-id="e7c02759-5e85-ca82-bed6-e0d41ef45c4d"
                    className="chat-close"
                    onClick={onClose}
                >
                    <img
                        src="/images/smarties-x.svg"
                        loading="lazy"
                        alt=""
                    />
                </div>
            </div>
            <div className="chat-content" ref={chatRef} style={{
                height: '20rem',
                overflowY: 'auto',
            }}>
                {chats.map((data, index) => {
                    const { direction, message, timestamp } = data;
                    if (direction !== 'outbound') {
                        return (
                            <div key={index} className="smartie-bubble-container">
                                <div className="smarties-avatar-small" />
                                <div>
                                    <div className="smartie-bubble">
                                        <div>{message}</div>
                                    </div>
                                    <div className="chat-time">{timestamp}</div>
                                </div>
                            </div>
                        );
                    } else {
                        return (
                            <div key={index} className="user-bubble-container">
                                <div className="user-bubble">
                                    <div>{message}</div>
                                </div>
                                <div className="chat-time">{timestamp}</div>
                            </div>
                        );
                    }
                })}
            </div>
            <div className="write-chat">
                <div className="chat-form-div">
                    <div className="form-block w-form">
                        <form
                            id="wf-form-chat-form"
                            name="wf-form-chat-form"
                            data-name="chat form"
                            method="get"
                            className="chat-form"
                            data-wf-page-id="688b61ee631f6165f14725b5"
                            data-wf-element-id="af5fe9b4-ecff-04c7-4715-fdcbb803b348"
                            aria-label="chat form"
                        >
                            <div className="textarea-div">
                                <textarea
                                    id="chatfield"
                                    name="chatfield"
                                    maxLength={5000}
                                    data-name="Chatfield"
                                    placeholder="Write your message here..."
                                    className="chat-type-area w-input"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            handleSendMessage(e);
                                        }
                                    }}
                                />
                            </div>
                            <div className="button-send" onClick={handleSendMessage}>
                                <img
                                    loading="lazy"
                                    src="/images/smarties-button-send.svg"
                                    alt=""
                                />
                            </div>
                        </form>
                        <div
                            className="w-form-done"
                            tabIndex={-1}
                            role="region"
                            aria-label="chat form success"
                        >
                            <div>Thank you! Your submission has been received!</div>
                        </div>
                        <div
                            className="w-form-fail"
                            tabIndex={-1}
                            role="region"
                            aria-label="chat form failure"
                        >
                            <div>Oops! Something went wrong while submitting the form.</div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Chat;