import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Chip, Button } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import { supabase } from '../lib/supabase';
import IssueFormModal from '../components/IssueFormModal';

export default function IssueList() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchIssues();
    }, []);

    const fetchIssues = async () => {
        setLoading(true);
        try {
            // issues 와 countermeasures 를 Join Fetch
            const { data, error } = await supabase
                .from('issues')
                .select(`
                    *,
                    countermeasures (*)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("이슈 데이터 로드 실패", error);
            } else {
                setIssues(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // DataGrid 컬럼 정의
    const columns = [
        { field: 'issue_number', headerName: 'ID', width: 60 },
        {
            field: 'category',
            headerName: '분류',
            width: 150,
            valueGetter: (params, row) => {
                const projects = row.project_names?.join(', ') || '';
                const modules = row.module_names?.join(', ') || '';
                const cat = [];
                if (projects) cat.push(`[P: ${projects}]`);
                if (modules) cat.push(`[M: ${modules}]`);
                return cat.join('\n');
            },
            renderCell: (params) => (
                <Box sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.2, py: 1 }}>
                    {params.value}
                </Box>
            )
        },
        {
            field: 'description',
            headerName: '내용 (이슈)',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', py: 1, wordBreak: 'break-word' }}>
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'status_priority',
            headerName: '상태/중요도',
            width: 120,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 1 }}>
                    <Chip size="small" label={params.row.status} color="primary" variant="outlined" />
                    <Chip size="small" label={params.row.priority}
                        color={params.row.priority === 'High' ? 'error' : (params.row.priority === 'Low' ? 'success' : 'warning')}
                        variant="outlined"
                    />
                </Box>
            )
        },
        {
            field: 'managers',
            headerName: '등록/담당',
            width: 130,
            renderCell: (params) => (
                <Box sx={{ py: 1 }}>
                    <Typography variant="caption" display="block">등록: {params.row.creator_id || '알 수 없음'}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                        담당: {params.row.assignee_ids?.join(', ') || '지정안됨'}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'countermeasures',
            headerName: '대책 내역',
            flex: 1.5,
            minWidth: 300,
            renderCell: (params) => {
                const cmList = params.value || [];
                if (cmList.length === 0) {
                    return <Typography variant="caption" color="text.secondary" sx={{ py: 1 }}>등록된 대책 없음</Typography>;
                }
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 1, width: '100%' }}>
                        {cmList.map((cm, idx) => (
                            <Box key={cm.id || idx} sx={{
                                p: 1,
                                bgcolor: 'background.default',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1
                            }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="caption" fontWeight="bold">- 담당: {cm.owner_id || '미정'}</Typography>
                                    <Typography variant="caption" color="primary">적용 V: {cm.apply_ver_id || 'N/A'}</Typography>
                                </Box>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {cm.description}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                );
            }
        },
        {
            field: 'created_at',
            headerName: '등록일시',
            width: 110,
            valueGetter: (params, row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
        },
    ];

    return (
        <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 0 }}>
                    이슈 관리
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => setIsModalOpen(true)}
                >
                    이슈 등록
                </Button>
            </Box>
            <Paper sx={{ flexGrow: 1, p: 1, width: '100%' }}>
                <DataGrid
                    rows={issues}
                    columns={columns}
                    loading={loading}
                    getRowHeight={() => 'auto'} // 자동 높이 조절
                    getEstimatedRowHeight={() => 100}
                    slots={{ toolbar: GridToolbar }}
                    slotProps={{
                        toolbar: {
                            showQuickFilter: true,
                        },
                    }}
                    disableRowSelectionOnClick
                    sx={{
                        '& .MuiDataGrid-cell': {
                            display: 'flex',
                            alignItems: 'flex-start', // 내용을 위로 정렬 (내용이 많을 때 대비)
                        },
                    }}
                />
            </Paper>

            <IssueFormModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchIssues}
            />
        </Box>
    );
}