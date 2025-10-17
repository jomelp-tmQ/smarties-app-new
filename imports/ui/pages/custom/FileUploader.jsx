import React, { useRef, useState } from 'react';
// import { UploadManager, FileUpload } from "@tmq-justin/uploadmanager-client";
import moment from 'moment';
import FileUploadWatcher from '../../../api/client/watchers/vapi/FileUploadWatcher';
import { useWatcher } from '../../../api/client/Watcher2';
// import './FileUploaders.css';

const FileUploader = () => {
    const watcher = useRef(FileUploadWatcher).current;
    useWatcher(watcher);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef(null);

    const refetchFiles = async () => {
        watcher.setValue("isLoadingFiles", true);
        await watcher.fetchFiles();
    };

    const handleFiles = async (files) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            await watcher.upload(files);
            // Optionally refetch after upload if your watcher doesn't already do this
            // await refetchFiles();
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const handleFileInputChange = async (event) => {
        const files = event.target.files;
        await handleFiles(files);
    };

    const onDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!uploading) setDragActive(true);
    };

    const onDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const onDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (uploading) return;
        const dt = e.dataTransfer;
        const files = dt?.files;
        await handleFiles(files);
    };

    const uploadProgress = watcher.getValue("uploadProgress");

    // Inline styles to layer the hidden input over your pretty UI
    const styles = {
        wrapper: {
            position: 'relative',
            width: '100%',
            cursor: uploading ? 'not-allowed' : 'pointer',
            userSelect: 'none'
        },
        hiddenInput: {
            // Make the input cover the whole area for accessibility + click
            position: 'absolute',
            inset: 0,
            display: 'none',
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: uploading ? 'not-allowed' : 'pointer'
        },
        base: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            minHeight: 120,
            borderRadius: 16,
            border: '1.5px dashed rgba(0,0,0,0.2)',
            background: '#fff',
            transition: 'border-color 150ms ease, background 150ms ease, transform 150ms ease',
            padding: 16,
            ...(dragActive && {
                borderColor: '#4F46E5',
                background: 'rgba(79,70,229,0.04)',
                transform: 'translateY(-1px)'
            }),
            ...(uploading && {
                opacity: 0.7
            })
        },
        iconWrap: {
            width: 48,
            height: 48,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(79,70,229,0.08)'
        },
        icon: {
            width: 24,
            height: 24
        },
        textWrap: {
            display: 'flex',
            flexDirection: 'column',
            gap: 4
        },
        mainText: {
            fontSize: 16,
            lineHeight: 1.4
        },
        linkish: {
            textDecoration: 'underline',
            color: '#4F46E5',
            cursor: uploading ? 'not-allowed' : 'pointer'
        },
        subLabel: {
            fontSize: 12,
            color: 'rgba(0,0,0,0.6)'
        },
        progressWrap: {
            marginTop: 12
        },
        progressBar: {
            width: '100%',
            height: 8,
            borderRadius: 999,
            background: 'rgba(0,0,0,0.08)',
            overflow: 'hidden',
            marginBottom: 6
        },
        progressFill: (pct) => ({
            width: `${pct || 0}%`,
            height: '100%',
            background: '#4F46E5',
            transition: 'width 150ms ease'
        }),
        status: {
            fontSize: 12,
            color: 'rgba(0,0,0,0.75)'
        }
    };

    return (
        <div className="file-uploader" style={{ width: "inherit" }}>
            {/* ---- Pretty Upload UI (from your commented block), wired up ---- */}
            <div
                onDragOver={onDragOver}
                onDragEnter={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                aria-disabled={uploading}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
                        inputRef.current?.click();
                    }
                }}
                style={{ pointerEvents: uploading ? "none" : "auto" }}
            >
                {/* Visual block */}
                <div className="file-upload-base" onClick={() => !uploading && inputRef.current?.click()} >
                    <div className="file-upload-content" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="fileupload-icon" style={styles.iconWrap}>
                            <img
                                src="https://cdn.prod.website-files.com/67ece27c367a4f53eeef80d8/681cad4bdaec95b6d81530f7_upload-cloud.svg"
                                loading="lazy"
                                width={20}
                                height={20}
                                alt=""
                                className="upload-cloud"
                                style={styles.icon}
                            />
                        </div>
                        <div className="file-upload-texts" style={styles.textWrap}>
                            <div className="fileupload-label" style={styles.mainText}>
                                <span
                                    className="spanlink-upload"
                                    style={styles.linkish}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!uploading) inputRef.current?.click();
                                    }}
                                >
                                    Click to upload
                                </span>{" "}
                                or drag and drop
                            </div>
                            <div className="fileupload-sublabel" style={styles.subLabel}>
                                SVG, PNG, JPG or GIF (max. 800x400px)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Invisible input covering the whole area for native click behavior */}
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    disabled={uploading}
                    onChange={handleFileInputChange}
                    className="file-input"
                    style={styles.hiddenInput}
                    aria-label="Upload files"
                />
            </div>

            {/* Progress area — keeps your existing watcher-driven messaging */}
            {uploadProgress && (
                <div
                    className="upload-progress"
                    data-status={uploadProgress.status}
                    style={styles.progressWrap}
                    aria-live="polite"
                >
                    <div className="progress-bar" style={styles.progressBar}>
                        <div
                            className="progress-fill"
                            style={styles.progressFill(uploadProgress.progress)}
                        />
                    </div>
                    <span style={styles.status}>
                        {uploadProgress.status === 'uploading' &&
                            `Uploading ${uploadProgress.fileName} (${uploadProgress.currentFile}/${uploadProgress.totalFiles})... ${uploadProgress.progress}%`}
                        {uploadProgress.status === 'complete' &&
                            `Uploaded ${uploadProgress.fileName} successfully!`}
                        {uploadProgress.status === 'error' &&
                            `Upload failed: ${uploadProgress.error}`}
                    </span>
                </div>
            )}
        </div>
    );
};

export default FileUploader;
