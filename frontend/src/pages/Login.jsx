import { Button, Box, Typography, Paper } from '@mui/material';
import { supabase } from '../lib/supabase';

export default function Login() {
    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: 'http://localhost:5173' }, // 슬래시 없는 주소
        });
    };

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#f5f5f5' }}>
            <Paper elevation={3} sx={{ p: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 350 }}>
                <Typography variant="h4" fontWeight="bold" color="primary">QC-SYSTEM</Typography>
                <Typography variant="body1" color="text.secondary">사내 계정으로 로그인해주세요.</Typography>
                <Button variant="contained" size="large" fullWidth onClick={handleLogin} sx={{ py: 1.5, fontSize: '1.1rem' }}>
                    Google 계정으로 로그인
                </Button>
            </Paper>
        </Box>
    );
}