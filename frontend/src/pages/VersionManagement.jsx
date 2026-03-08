import { Box, Typography, Paper } from '@mui/material';

export default function VersionManagement() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <Paper sx={{ p: 5, textAlign: 'center', minWidth: 300 }}>
                <Typography variant="h5" color="text.secondary" fontWeight="bold">
                    버전 관리
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                    🛠️ 현재 준비 중인 기능입니다.
                </Typography>
            </Paper>
        </Box>
    );
}