import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

const MultiSelectDropdown = ({
    options,
    selectedValues,
    onChange,
    id,
    name,
    placeholder = "Select options"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    // Filter options based on search term
    const filteredOptions = options.filter(option =>
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle checkbox change
    const handleCheckboxChange = (optionId) => {
        const newSelectedValues = selectedValues.includes(optionId)
            ? selectedValues.filter(id => id !== optionId)
            : [...selectedValues, optionId];

        onChange({ target: { selectedOptions: newSelectedValues.map(id => ({ value: id })) } });
    };

    // Update dropdown position when it opens
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Get the display text for the dropdown
    const getDisplayText = () => {
        if (selectedValues.length === 0) return placeholder;

        if (selectedValues.length === 1) {
            const selectedOption = options.find(option => option.id === selectedValues[0]);
            return selectedOption ? selectedOption.name : placeholder;
        }

        return `${selectedValues.length} items selected`;
    };

    // Inline styles
    const styles = {
        container: {
            position: 'relative',
            width: '100%'
        },
        button: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            cursor: 'pointer'
        },
        buttonText: {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
        },
        svg: {
            width: '20px',
            height: '20px',
            marginLeft: '8px',
            marginRight: '-4px',
            transition: 'transform 0.2s ease'
        },
        svgRotated: {
            transform: 'rotate(180deg)'
        },
        dropdownMenu: {
            position: 'fixed',
            zIndex: 9999, // Much higher z-index to ensure it's above other elements
            backgroundColor: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            maxHeight: '240px',
            overflowY: 'auto'
        },
        searchContainer: {
            position: 'sticky',
            top: 0,
            padding: '8px',
            backgroundColor: '#fff',
            borderBottom: '1px solid #d1d5db'
        },
        searchInput: {
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            outline: 'none'
        },
        searchInputFocus: {
            borderColor: '#3b82f6',
            boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)'
        },
        optionsList: {
            margin: 0,
            padding: '4px 0',
            listStyle: 'none'
        },
        optionItem: {
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            fontSize: '14px',
            cursor: 'pointer'
        },
        optionItemHover: {
            backgroundColor: '#f3f4f6'
        },
        checkbox: {
            width: '16px',
            height: '16px',
            marginRight: '8px'
        },
        label: {
            flex: 1,
            cursor: 'pointer'
        },
        noOptions: {
            padding: '8px 12px',
            fontSize: '14px',
            color: '#6b7280'
        }
    };

    // Dropdown menu portal component
    const DropdownMenu = () => {
        return ReactDOM.createPortal(
            <div
                ref={dropdownRef}
                style={{
                    ...styles.dropdownMenu,
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`
                }}
            >
                {/* Search input */}
                <div style={styles.searchContainer}>
                    <input
                        type="text"
                        style={styles.searchInput}
                        placeholder="Search options..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={(e) => e.target.style.boxShadow = styles.searchInputFocus.boxShadow}
                        onBlur={(e) => e.target.style.boxShadow = 'none'}
                    />
                </div>

                {/* Options list */}
                <ul style={styles.optionsList}>
                    {filteredOptions.map((option) => (
                        <li
                            key={option.id}
                            style={styles.optionItem}
                            onClick={() => handleCheckboxChange(option.id)}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = styles.optionItemHover.backgroundColor}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = ''}
                        >
                            <input
                                type="checkbox"
                                style={styles.checkbox}
                                checked={selectedValues.includes(option.id)}
                                onChange={() => { }}
                                id={`option-${option.id}`}
                            />
                            <label
                                htmlFor={`option-${option.id}`}
                                style={styles.label}
                            >
                                {option.name}
                            </label>
                        </li>
                    ))}
                    {filteredOptions.length === 0 && (
                        <li style={styles.noOptions}>
                            No options found
                        </li>
                    )}
                </ul>
            </div>,
            document.body
        );
    };

    return (
        <div style={styles.container}>
            {/* Dropdown button */}
            <button
                type="button"
                ref={buttonRef}
                style={styles.button}
                onClick={() => setIsOpen(!isOpen)}
                id={id}
                name={name}
            >
                <span style={styles.buttonText}>{getDisplayText()}</span>
                <svg
                    style={{ ...styles.svg, ...(isOpen ? styles.svgRotated : {}) }}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {/* Dropdown menu */}
            {isOpen && <DropdownMenu />}
        </div>
    );
};

export default MultiSelectDropdown;