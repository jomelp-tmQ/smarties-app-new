import React from 'react';
import { LoaderCircle } from 'lucide-react';
/**
 * Loader component with Lucide LoaderCircle icon and text in a circle layout.
 * @param {Object} props
 * @param {string} props.text - The text to display inside the loader.
 * @param {number} [props.size=32] - The size of the loader icon.
 * @param {string} [props.color='#555'] - The color of the loader icon.
 */
const Loader = ({ text = "Loading...", size = 16, color = '#555' }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div
            style={{
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
            }}
        >
            <LoaderCircle data-testid="loader-icon" width={size} height={size} color={color} className="loader-spin" />
        </div>
        {text && <span style={{ color, fontWeight: 500, fontSize: size }}>{text}</span>}
    </div>
);

export default Loader;
