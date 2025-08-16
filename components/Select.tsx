'use client'

import { useState, useRef, useEffect } from 'react'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  options: SelectOption[]
  value: string | string[] | null
  onChange: (value: string | string[] | null) => void
  placeholder: string
  multiple?: boolean
  searchable?: boolean
  disabled?: boolean
  className?: string
}

export default function Select({
  options,
  value,
  onChange,
  placeholder,
  multiple = false,
  searchable = true,
  disabled = false,
  className = ''
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get selected options
  const selectedOptions = multiple
    ? options.filter(option => (value as string[])?.includes(option.value))
    : options.filter(option => option.value === value)

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
            handleOptionClick(filteredOptions[focusedIndex])
          }
          break
        case 'Escape':
          setIsOpen(false)
          setFocusedIndex(-1)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, focusedIndex, filteredOptions])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOptionClick = (option: SelectOption) => {
    if (multiple) {
      const currentValue = (value as string[]) || []
      const newValue = currentValue.includes(option.value)
        ? currentValue.filter(v => v !== option.value)
        : [...currentValue, option.value]
      onChange(newValue.length > 0 ? newValue : null)
    } else {
      onChange(option.value)
      setIsOpen(false)
      setSearchTerm('')
    }
    setFocusedIndex(-1)
  }

  const handleRemoveOption = (optionValue: string) => {
    if (multiple) {
      const currentValue = (value as string[]) || []
      const newValue = currentValue.filter(v => v !== optionValue)
      onChange(newValue.length > 0 ? newValue : null)
    }
  }

  const handleClearAll = () => {
    onChange(null)
    setSearchTerm('')
  }

  const displayValue = multiple
    ? selectedOptions.length > 0
      ? `${selectedOptions.length} selected`
      : placeholder
    : selectedOptions[0]?.label || placeholder

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
    >
      {/* Main select button */}
      <div
        className={`
          relative flex items-center justify-between w-full px-3 py-2 
          border border-gray-300 rounded-md shadow-sm cursor-pointer
          bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
      >
        <div className="flex-1 min-w-0">
          <span className={`block truncate ${!selectedOptions.length ? 'text-gray-500' : ''}`}>
            {displayValue}
          </span>
        </div>
        
        {/* Selected options chips for multi-select */}
        {multiple && selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-1 mr-2">
            {selectedOptions.slice(0, 2).map(option => (
              <span
                key={option.value}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
              >
                {option.label}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveOption(option.value)
                  }}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
            {selectedOptions.length > 2 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                +{selectedOptions.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Clear button */}
        {((multiple && selectedOptions.length > 0) || (!multiple && value)) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleClearAll()
            }}
            className="mr-2 text-gray-400 hover:text-gray-600"
            aria-label="Clear selection"
          >
            ×
          </button>
        )}

        {/* Dropdown arrow */}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Search input */}
          {searchable && (
            <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Options list */}
          <ul role="listbox" className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = multiple
                  ? (value as string[])?.includes(option.value)
                  : option.value === value
                const isFocused = index === focusedIndex

                return (
                  <li
                    key={option.value}
                    className={`
                      relative cursor-pointer select-none px-3 py-2
                      ${isSelected ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}
                      ${isFocused ? 'bg-blue-50' : ''}
                      hover:bg-blue-50
                    `}
                    onClick={() => handleOptionClick(option)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center">
                      {multiple && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      )}
                      <span className="block truncate">{option.label}</span>
                    </div>
                  </li>
                )
              })
            ) : (
              <li className="px-3 py-2 text-gray-500 text-center">
                No options found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
