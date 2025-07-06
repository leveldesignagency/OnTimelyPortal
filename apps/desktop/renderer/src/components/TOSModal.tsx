import React, { useState } from 'react';

interface TOSModalProps {
  open: boolean;
  onAccept: () => void;
  onClose: () => void;
  dark?: boolean;
}

const TOSModal: React.FC<TOSModalProps> = ({ open, onAccept, onClose, dark }) => {
  const [checked, setChecked] = useState({
    tos: false,
    rights: false,
  });
  const allChecked = checked.tos && checked.rights;

  if (!open) return null;

  const glassBg = dark
    ? 'rgba(30, 32, 38, 0.85)'
    : 'rgba(255, 255, 255, 0.85)';
  const textColor = dark ? '#fff' : '#222';
  const secondaryText = dark ? '#ccc' : '#444';
  const borderColor = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const buttonBg = dark ? '#ccc' : '#444';
  const buttonText = dark ? '#222' : '#fff';
  const cancelBg = dark ? 'rgba(255,255,255,0.04)' : '#f3f3f3';
  const cancelText = dark ? '#fff' : '#333';
  const linkColor = dark ? '#aaa' : '#888';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: dark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)'
    }}>
      <div style={{
        background: glassBg,
        borderRadius: 20,
        maxWidth: 480,
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        padding: 24,
        boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.7)' : '0 8px 32px rgba(0,0,0,0.18)',
        border: `1.5px solid ${borderColor}`,
        color: textColor,
        display: 'flex', flexDirection: 'column',
      }}>
        <h2 style={{ marginTop: 0, color: textColor, fontWeight: 800, fontSize: 22 }}>Image Upload Terms</h2>
        <div style={{
          maxHeight: 320,
          overflowY: 'auto',
          marginBottom: 12,
          background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          padding: 12,
        }}>
          <h3 style={{ color: textColor, fontWeight: 700, fontSize: 16 }}>Terms of Service (TOS)</h3>
          <p style={{ color: secondaryText, fontSize: 14 }}>You may only upload or link to images you own or have the legal right to use. Uploading or displaying copyrighted or unauthorized images is strictly prohibited.</p>
          <h3 style={{ color: textColor, fontWeight: 700, fontSize: 16 }}>User Agreement</h3>
          <p style={{ color: secondaryText, fontSize: 14 }}>By uploading or linking to images, you confirm you have the necessary rights and permissions. You are solely responsible for the content you upload or display.</p>
          <h3 style={{ color: textColor, fontWeight: 700, fontSize: 16 }}>Moderation</h3>
          <p style={{ color: secondaryText, fontSize: 14 }}>We may review and remove images that violate these terms, either automatically or manually.</p>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4, color: textColor }}>
            <input type="checkbox" checked={checked.tos} onChange={e => setChecked(c => ({ ...c, tos: e.target.checked }))} style={{ marginRight: 8 }} />
            I agree to the Terms of Service and Take-down Policy
          </label>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: textColor }}>
            <input type="checkbox" checked={checked.rights} onChange={e => setChecked(c => ({ ...c, rights: e.target.checked }))} style={{ marginRight: 8 }} />
            I confirm I have the rights to these images
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: cancelBg, color: cancelText, fontWeight: 600, fontSize: 15, boxShadow: '0 1px 4px #0001' }}>Cancel</button>
          <button onClick={onAccept} disabled={!allChecked} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: allChecked ? buttonBg : '#bbb', color: buttonText, fontWeight: 700, fontSize: 15, cursor: allChecked ? 'pointer' : 'not-allowed', boxShadow: '0 1px 4px #0001' }}>Accept</button>
        </div>
      </div>
    </div>
  );
};

export default TOSModal; 