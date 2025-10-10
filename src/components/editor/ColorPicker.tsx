//src/components/editor/ColorPicker.tsx

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Type } from 'lucide-react';

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  onMenuOpen?: () => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ 
  currentColor, 
  onColorChange, 
  onMenuOpen 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempColor, setTempColor] = useState(currentColor);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<'left' | 'right'>('left');

  const presetColors = [
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
    '#FF0000', '#FF6600', '#FFCC00', '#00FF00', '#0066FF', '#6600FF',
    '#FF3366', '#FF9933', '#FFFF00', '#33FF33', '#3399FF', '#9933FF',
    '#990000', '#CC6600', '#999900', '#009900', '#003399', '#330099'
  ];

  const hexToHsl = useCallback((hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }, []);

  const hslToHex = useCallback((h: number, s: number, l: number) => {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }, []);

  useEffect(() => {
    if (currentColor) {
      const [h, s, l] = hexToHsl(currentColor);
      setHue(h);
      setSaturation(s);
      setLightness(l);
      setTempColor(currentColor);
    }
  }, [currentColor, hexToHsl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuToggle = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 280;
      
      if (rect.right + menuWidth > window.innerWidth) {
        setMenuPosition('right');
      } else {
        setMenuPosition('left');
      }
    }
    
    onMenuOpen?.();
    setIsOpen(!isOpen);
  };

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHue = parseInt(e.target.value);
    let currentSaturation = saturation;
    let currentLightness = lightness;

    if (saturation === 0 || lightness === 0 || lightness === 100) {
      currentSaturation = 100;
      currentLightness = 50;
      setSaturation(100);
      setLightness(50);
    }

    setHue(newHue);
    const newColor = hslToHex(newHue, currentSaturation, currentLightness);
    setTempColor(newColor);
  };

  const handleSaturationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSaturation = parseInt(e.target.value);
    let currentLightness = lightness;

    if (lightness === 0 || lightness === 100) {
        currentLightness = 50;
        setLightness(50);
    }

    setSaturation(newSaturation);
    const newColor = hslToHex(hue, newSaturation, currentLightness);
    setTempColor(newColor);
  };

  const handleLightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLightness = parseInt(e.target.value);
    setLightness(newLightness);
    const newColor = hslToHex(hue, saturation, newLightness);
    setTempColor(newColor);
  };

  const handlePresetClick = (color: string) => {
    const [h, s, l] = hexToHsl(color);
    setHue(h);
    setSaturation(s);
    setLightness(l);
    setTempColor(color);
    onColorChange(color);
    setIsOpen(false);
  };

  const handleApplyColor = () => {
    onColorChange(tempColor);
    setIsOpen(false);
  };

  const positionStyle = menuPosition === 'right' ? { right: 0 } : { left: 0 };

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={buttonRef}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleMenuToggle}
        title="Text Color"
        className="p-2 rounded-lg transition-all duration-200 hover:bg-gray-100 text-gray-700 hover:text-gray-900 border border-transparent hover:scale-105 active:scale-95 relative"
      >
        <div className="relative">
          <Type className="w-4 h-4" />
          <div 
            className="absolute -bottom-0.5 left-0 right-0 h-1 rounded-full"
            style={{ backgroundColor: currentColor }}
          />
        </div>
      </button>

      {isOpen && (
        <div 
          className="absolute z-50 mt-2 bg-white rounded-lg border border-gray-200 p-4 w-72 shadow-lg"
          style={positionStyle}
        >
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Quick Colors</h4>
            <div className="grid grid-cols-6 gap-2">
              {presetColors.map((color) => (
                <button
                  key={color}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePresetClick(color)}
                  className="w-8 h-8 rounded border-2 border-gray-200 hover:border-gray-400 transition-all duration-150 hover:scale-110"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-700">Custom Color</h4>
            
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-8 rounded border-2 border-gray-200"
                style={{ backgroundColor: tempColor }}
              />
              <span className="text-xs font-mono text-gray-600">{tempColor}</span>
            </div>

            <div>
              <label className="text-xs text-gray-600 block mb-1">Hue</label>
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={handleHueChange}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), 
                    hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), 
                    hsl(360, 100%, 50%))`
                }}
              />
            </div>

            <div>
              <label className="text-xs text-gray-600 block mb-1">Saturation</label>
              <input
                type="range"
                min="0"
                max="100"
                value={saturation}
                onChange={handleSaturationChange}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(${hue}, 0%, ${lightness}%), hsl(${hue}, 100%, ${lightness}%))`
                }}
              />
            </div>

            <div>
              <label className="text-xs text-gray-600 block mb-1">Lightness</label>
              <input
                type="range"
                min="0"
                max="100"
                value={lightness}
                onChange={handleLightnessChange}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(${hue}, ${saturation}%, 0%), 
                    hsl(${hue}, ${saturation}%, 50%), 
                    hsl(${hue}, ${saturation}%, 100%))`
                }}
              />
            </div>

            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleApplyColor}
              className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 text-sm font-medium"
            >
              Apply Color
            </button>
          </div>
        </div>
      )}
    </div>
  );
};