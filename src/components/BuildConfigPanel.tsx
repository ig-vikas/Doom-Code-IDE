import { useState, useCallback } from 'react';
import { useBuildStore } from '../stores';
import type { BuildProfile } from '../types';
import {
  VscAdd,
  VscTrash,
  VscClose,
  VscCheck,
  VscEdit,
  VscDebugRestart,
} from 'react-icons/vsc';

type Mode = 'list' | 'add' | 'edit';

export default function BuildConfigPanel({ onClose }: { onClose: () => void }) {
  const profiles = useBuildStore((s) => s.profiles);
  const activeProfileId = useBuildStore((s) => s.activeProfileId);
  const compilerPath = useBuildStore((s) => s.compilerPath);
  const setActiveProfile = useBuildStore((s) => s.setActiveProfile);
  const setCompilerPath = useBuildStore((s) => s.setCompilerPath);
  const addProfile = useBuildStore((s) => s.addProfile);
  const updateProfile = useBuildStore((s) => s.updateProfile);
  const removeProfile = useBuildStore((s) => s.removeProfile);
  const resetProfiles = useBuildStore((s) => s.resetProfiles);

  const [mode, setMode] = useState<Mode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formStandard, setFormStandard] = useState('c++17');
  const [formFlags, setFormFlags] = useState('');
  const [formTimeLimit, setFormTimeLimit] = useState('5000');
  const [formBuildMode, setFormBuildMode] = useState<'tc' | 'file' | 'custom'>('tc');
  const [formCustomCommand, setFormCustomCommand] = useState('');
  const [formError, setFormError] = useState('');

  const openAddForm = useCallback(() => {
    setMode('add');
    setEditingId(null);
    setFormName('');
    setFormStandard('c++17');
    setFormFlags('');
    setFormTimeLimit('5000');
    setFormBuildMode('tc');
    setFormCustomCommand('');
    setFormError('');
  }, []);

  const openEditForm = useCallback((profile: BuildProfile) => {
    setMode('edit');
    setEditingId(profile.id);
    setFormName(profile.name);
    setFormStandard(profile.standard);
    setFormFlags(profile.flags.join(' '));
    setFormTimeLimit(String(profile.timeLimit));
    setFormBuildMode(profile.mode || 'file');
    setFormCustomCommand(profile.customCommand || '');
    setFormError('');
  }, []);

  const closeForm = useCallback(() => {
    setMode('list');
    setEditingId(null);
    setFormError('');
  }, []);

  const handleSave = useCallback(() => {
    const name = formName.trim();
    if (!name) {
      setFormError('Profile name is required');
      return;
    }
    if (formBuildMode === 'custom' && !formCustomCommand.trim()) {
      setFormError('Custom command is required for custom mode');
      return;
    }
    const flags = formFlags.trim().split(/\s+/).filter(Boolean);
    const timeLimit = parseInt(formTimeLimit) || 5000;

    if (mode === 'add') {
      addProfile({
        name,
        standard: formStandard,
        flags,
        timeLimit,
        isDefault: false,
        mode: formBuildMode,
        customCommand: formBuildMode === 'custom' ? formCustomCommand.trim() : undefined,
      });
    } else if (mode === 'edit' && editingId) {
      updateProfile(editingId, {
        name,
        standard: formStandard,
        flags,
        timeLimit,
        mode: formBuildMode,
        customCommand: formBuildMode === 'custom' ? formCustomCommand.trim() : undefined,
      });
    }
    closeForm();
  }, [formName, formStandard, formFlags, formTimeLimit, formBuildMode, formCustomCommand, mode, editingId, addProfile, updateProfile, closeForm]);

  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const activeFlags = activeProfile?.flags.join(' ') ?? '';
  const activeMode = activeProfile?.mode || 'file';

  if (mode !== 'list') {
    return (
      <div className="build-config-panel">
        <div className="build-config-header">
          <span className="build-config-title">
            {mode === 'add' ? 'New Build Profile' : 'Edit Profile'}
          </span>
          <button className="icon-btn" onClick={closeForm} title="Cancel">
            <VscClose />
          </button>
        </div>
        <div className="build-config-form">
          <div className="snippet-form-field">
            <label>Profile Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. My Profile"
              autoFocus
            />
          </div>
          <div className="snippet-form-field">
            <label>Run Mode</label>
            <select
              value={formBuildMode}
              onChange={(e) => setFormBuildMode(e.target.value as 'tc' | 'file' | 'custom')}
              className="build-config-select"
            >
              <option value="tc">Test Cases (from panel)</option>
              <option value="file">File I/O (input.txt → output.txt)</option>
              <option value="custom">Custom Command</option>
            </select>
          </div>
          {formBuildMode === 'custom' && (
            <div className="snippet-form-field">
              <label>Custom Command</label>
              <input
                type="text"
                value={formCustomCommand}
                onChange={(e) => setFormCustomCommand(e.target.value)}
                placeholder='e.g. g++ {flags} "{file}" -o "{exe}" && "{exe}"'
              />
              <span style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: 4 }}>
                Placeholders: {'{file}'} = source path, {'{exe}'} = executable path, {'{dir}'} = file directory, {'{flags}'} = compiler flags
              </span>
            </div>
          )}
          <div className="snippet-form-field">
            <label>C++ Standard</label>
            <select
              value={formStandard}
              onChange={(e) => setFormStandard(e.target.value)}
              className="build-config-select"
            >
              <option value="c++11">C++11</option>
              <option value="c++14">C++14</option>
              <option value="c++17">C++17</option>
              <option value="c++20">C++20</option>
              <option value="c++23">C++23</option>
            </select>
          </div>
          <div className="snippet-form-field">
            <label>Compiler Flags (space-separated)</label>
            <input
              type="text"
              value={formFlags}
              onChange={(e) => setFormFlags(e.target.value)}
              placeholder="-std=c++17 -O2 -Wall"
            />
          </div>
          <div className="snippet-form-field">
            <label>Time Limit (ms)</label>
            <input
              type="number"
              value={formTimeLimit}
              onChange={(e) => setFormTimeLimit(e.target.value)}
              min={1000}
              max={60000}
              step={1000}
            />
          </div>
          {formError && <div className="snippet-form-error">{formError}</div>}
          <div className="snippet-form-actions">
            <button className="snippet-btn secondary" onClick={closeForm}>
              Cancel
            </button>
            <button className="snippet-btn primary" onClick={handleSave}>
              <VscCheck /> {mode === 'add' ? 'Add Profile' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="build-config-panel">
      <div className="build-config-header">
        <span className="build-config-title">Build Configuration</span>
        <button className="icon-btn" onClick={onClose} title="Close">
          <VscClose />
        </button>
      </div>

      <div className="build-config-section">
        <div className="snippet-form-field">
          <label>Compiler Path</label>
          <input
            type="text"
            value={compilerPath}
            onChange={(e) => setCompilerPath(e.target.value)}
            placeholder="g++"
          />
        </div>
      </div>

      <div className="build-config-section">
        <div className="build-config-section-header">
          <span>Shell Command ({activeMode === 'tc' ? 'Test Cases' : activeMode === 'file' ? 'File I/O' : 'Custom'})</span>
        </div>
        <div className="build-cmd-preview">
          <code>
            {activeMode === 'tc'
              ? `${compilerPath || 'g++'} ${activeFlags} "<file>" -o "<file>.exe" && run each test case via stdin/stdout`
              : activeMode === 'file'
              ? `del "<file>.exe" 2>nul & ${compilerPath || 'g++'} ${activeFlags} "<file>" -o "<file>.exe" && "<file>.exe" < input.txt > output.txt`
              : (activeProfile?.customCommand || 'No custom command set')}
          </code>
        </div>
      </div>

      <div className="build-config-section">
        <div className="build-config-section-header">
          <span>Build Profiles</span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button className="icon-btn-sm" onClick={resetProfiles} title="Reset to defaults">
              <VscDebugRestart />
            </button>
            <button className="icon-btn-sm" onClick={openAddForm} title="Add profile">
              <VscAdd />
            </button>
          </div>
        </div>

        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`build-profile-item ${profile.id === activeProfileId ? 'active' : ''}`}
            onClick={() => setActiveProfile(profile.id)}
          >
            <div className="build-profile-info">
              <span className="build-profile-name">
                {profile.name}
                <span className="build-mode-badge">{profile.mode === 'tc' ? 'TC' : profile.mode === 'custom' ? 'CMD' : 'FILE'}</span>
              </span>
              <span className="build-profile-flags">{profile.flags.join(' ')}</span>
            </div>
            <div className="snippet-item-actions" style={{ opacity: 1 }}>
              <button
                className="icon-btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditForm(profile);
                }}
                title="Edit profile"
              >
                <VscEdit />
              </button>
              {profiles.length > 1 && (
                <button
                  className="icon-btn-sm danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeProfile(profile.id);
                  }}
                  title="Delete profile"
                >
                  <VscTrash />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
