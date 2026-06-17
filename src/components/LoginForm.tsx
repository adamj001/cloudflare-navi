import React, { useState } from 'react';
import {
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert, 
  FormControlLabel,
  Checkbox,
} from '@mui/material';

import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
interface LoginFormProps {
  onLogin: (username: string, password: string, rememberMe: boolean) => void;
  loading?: boolean;
  error?: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, loading = false, error = null }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password, rememberMe);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '100%',
        p: { xs: 2, sm: 4 },
      }}
    >
      <Box
  sx={{
    p: { xs: 3, sm: 4 },
    borderRadius: 2,
    width: '100%',
    maxWidth: { xs: '90%', sm: 400 },
    background: 'transparent',
  }}
></Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 3,
          }}
        >
                    <Box
            sx={{
              mb: 2,
              width: 72,  // 稍微改大一点点，看着更大气
              height: 72,
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'secondary.main', 
              color: 'white',
              boxShadow: 3, // 加一点阴影，更有层次感
            }}
          >
            {/* 这里使用了刚刚引入的管理员图标 */}
            <ManageAccountsIcon sx={{ fontSize: 48 }} />
          </Box>

          <Typography component='h1' variant='h5' fontWeight='bold' textAlign='center'>
            导航站登录
          </Typography>
        </Box>

        {error && (
          <Alert severity='error' sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component='form' onSubmit={handleSubmit}>
          <TextField
            margin='normal'
            required
            fullWidth
            id='username'
            label='用户名'
            name='username'
            autoComplete='username'
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />
          <TextField
            margin='normal'
            required
            fullWidth
            name='password'
            label='密码'
            type='password'
            id='password'
            autoComplete='current-password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                value='remember'
                color='primary'
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
            }
            label='记住我（一个月内免登录）'
            sx={{ mb: 2 }}
          />
          <Button
            type='submit'
            fullWidth
            variant='contained'
            color='primary'
            disabled={loading || !username || !password}
            size='large'
            sx={{
              py: 1.5,
              mt: 2,
              mb: 2,
              borderRadius: 2,
            }}
          >
            {loading ? <CircularProgress size={24} color='inherit' /> : '登录'}
          </Button>
        </Box>
     </Box>
    </Box>
  );
};

export default LoginForm;
