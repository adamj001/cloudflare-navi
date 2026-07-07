// src/components/ConfirmDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import LogoutIcon from '@mui/icons-material/Logout';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const iconMap = {
  delete: { icon: <DeleteForeverIcon sx={{ fontSize: 22, color: '#fff' }} />, bgcolor: '#f44336' },
  warning: { icon: <WarningAmberIcon sx={{ fontSize: 22, color: '#000' }} />, bgcolor: '#ff9800' },
  logout: { icon: <LogoutIcon sx={{ fontSize: 22, color: '#fff' }} />, bgcolor: '#9c27b0' },
  info: { icon: <HelpOutlineIcon sx={{ fontSize: 22, color: '#fff' }} />, bgcolor: '#2196f3' },
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'error' | 'primary' | 'warning' | 'success';
  iconType?: keyof typeof iconMap;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  confirmColor = 'error',
  iconType = 'warning',
  onConfirm,
  onCancel,
}) => {
  const iconConfig = iconMap[iconType];

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', flexDirection: 'column',  
  alignItems: 'center', 
 gap: 1.5, pb: 0.5 , mb: 1.5}}>
        <Box sx={{
          width: 52, height: 52, borderRadius: '10px',
          bgcolor: iconConfig.bgcolor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 4px 14px ${iconConfig.bgcolor}66`,
        }}>
          {iconConfig.icon}
        </Box>
        <Typography fontWeight={700} fontSize="1.1rem">{title}</Typography>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mt: 1, 
    fontSize: '0.95rem',
    lineHeight: 1.7,         // 行距宽松一点
    px: 1, }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onCancel}
          sx={{ fontWeight: 700, textTransform: 'none', color: 'text.secondary' }}
        >
          {cancelText}
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          sx={{ borderRadius: '12px', px: 3, fontWeight: 700, textTransform: 'none' }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;