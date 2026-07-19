import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Alert,
  Button,
} from '@mui/material';

export interface ImportStats {
  groups: { total: number; created: number; merged: number };
  sites: { total: number; created: number; updated: number; skipped: number };
}

export interface ImportResultData {
  success: boolean;
  error?: string;
  stats?: ImportStats;
}

interface ImportResultDialogProps {
  open: boolean;
  result: ImportResultData | null;
  onClose: () => void;
}

const ImportResultDialog: React.FC<ImportResultDialogProps> = ({ open, result, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
      <DialogTitle>{result?.success ? '导入完成' : '导入失败'}</DialogTitle>
      <DialogContent>
        {result?.success ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            <Box>
              <Typography variant='subtitle2' color='text.secondary'>
                分组
              </Typography>
              <Typography>
                新建 {result.stats?.groups.created ?? 0} 个，合并 {result.stats?.groups.merged ?? 0} 个
                （共 {result.stats?.groups.total ?? 0} 个）
              </Typography>
            </Box>
            <Box>
              <Typography variant='subtitle2' color='text.secondary'>
                站点
              </Typography>
              <Typography>
                新建 {result.stats?.sites.created ?? 0} 个，更新 {result.stats?.sites.updated ?? 0} 个，跳过{' '}
                {result.stats?.sites.skipped ?? 0} 个（共 {result.stats?.sites.total ?? 0} 个）
              </Typography>
            </Box>
          </Box>
        ) : (
          <Alert severity='error' sx={{ mt: 1 }}>
            {result?.error || '未知错误'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant='contained'>
          确定
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportResultDialog;