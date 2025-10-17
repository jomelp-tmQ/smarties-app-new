export const fetchIconsBasedOnExtension = (extension) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'ico', 'webp'];
    const docExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx'];
    const txtExtensions = ['txt', 'md', 'rtf'];
    const archiveExtensions = ['zip', 'rar', '7z'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'flac', 'aac'];
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v', 'mpg', 'mpeg'];
    if (!extension) return 'images/smarties-icon-asset1.svg';
    // if extension has . then remove it
    if (extension.includes('.')) {
        extension = extension.split('.')[1];
    }
    if (imageExtensions.includes(extension)) {
        return 'images/smarties-icon-asset1.svg';
    }
    if (docExtensions.includes(extension)) {
        return 'images/smarties-icon-asset2.svg';
    }
    if (txtExtensions.includes(extension)) {
        return 'images/smarties-icon-asset3.svg';
    }
    if (archiveExtensions.includes(extension)) {
        return 'images/smarties-icon-asset5.svg';
    }
    if (audioExtensions.includes(extension)) {
        return 'svgs/smarties-icon-audiofile.svg';
    }
    if (videoExtensions.includes(extension)) {
        return 'svgs/smarties-icon-videofile.svg';
    }

    return 'images/smarties-icon-asset1.svg';
};

export const decodeAttributeList = (list) => {
    return (list || []).map(a => ({
        key: a.key,
        value: a && a.value && typeof a.value === 'object' && 'value' in a.value ? decodeAny(a.value) : a.value
    }));
}

export const decodeAny = (any) => {
    if (!any || any.value == null) return null;
    try {
        const binary = atob(any.value);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const text = new TextDecoder().decode(bytes);
        if (any.typeUrl && any.typeUrl.endsWith('/string')) return text;
        if (any.typeUrl && (any.typeUrl.endsWith('/int64') || any.typeUrl.endsWith('/double') || any.typeUrl.endsWith('/number'))) {
            const n = Number(text);
            return Number.isNaN(n) ? text : n;
        }
        if (any.typeUrl && any.typeUrl.endsWith('/json')) return JSON.parse(text);
        return text;
    } catch (e) {
        return any.value;
    }
}

export const truncateFileName = (name, max = 36) => {
    if (!name || typeof name !== 'string' || name.length <= max) return name;
    const dotIdx = name.lastIndexOf('.');
    let base = name;
    let ext = '';
    if (dotIdx > 0 && dotIdx < name.length - 1) {
        base = name.slice(0, dotIdx);
        ext = name.slice(dotIdx + 1);
    }
    const reserved = (ext ? ext.length + 1 : 0) + 3;
    const spare = max - reserved;
    if (spare <= 2) return name.slice(0, Math.max(0, max - 3)) + '...';
    const startLen = Math.max(1, Math.ceil(spare * 0.6));
    const endLen = Math.max(1, spare - startLen);
    const start = base.slice(0, startLen);
    const end = base.slice(Math.max(0, base.length - endLen));
    return ext ? `${start}...${end}.${ext}` : `${start}...${end}`;
}