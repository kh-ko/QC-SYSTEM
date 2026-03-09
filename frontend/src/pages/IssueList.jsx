import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Chip, Button } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import { supabase } from '../lib/supabase';

export default function IssueList() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usersOpts, setUsersOpts] = useState([]);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 50 });
    const [rowCount, setRowCount] = useState(0);
    const [refreshToggle, setRefreshToggle] = useState(false);

    useEffect(() => {
        fetchUsers();

        const handleMessage = (event) => {
            if (event.data === 'refresh_issues') {
                setRefreshToggle(prev => !prev);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        fetchIssues();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paginationModel.page, paginationModel.pageSize, refreshToggle]);

    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('*');
        if (data) setUsersOpts(data);
    };

    const fetchIssues = async () => {
        setLoading(true);
        try {
            const from = paginationModel.page * paginationModel.pageSize;
            const to = from + paginationModel.pageSize - 1;

            // issues 와 countermeasures 를 Join Fetch
            const { data, error, count } = await supabase
                .from('issues')
                .select(`
                    *,
                    countermeasures (*)
                `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                console.error("이슈 데이터 로드 실패", error);
            } else {
                setIssues(data || []);
                if (count !== null) setRowCount(count);
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
            headerName: '프로젝트/모듈',
            width: 150,
            valueGetter: (params, row) => {
                const projects = row.project_names?.join(', ') || '';
                const modules = row.module_names?.join(', ') || '';
                return `${projects} / ${modules}`;
            },
            renderCell: (params) => {
                const projects = params.row.project_names?.join(', ') || '없음';
                const modules = params.row.module_names?.join(', ') || '없음';
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: 'calc(100% + 20px)', height: '100%', justifyContent: 'center', mx: '-10px' }}>
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', borderBottom: '1px solid #e0e0e0', px: '10px', py: 1 }}>
                            <Typography variant="caption">{projects}</Typography>
                        </Box>
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', px: '10px', py: 1 }}>
                            <Typography variant="caption" color="text.secondary">{modules}</Typography>
                        </Box>
                    </Box>
                );
            }
        },
        {
            field: 'description',
            headerName: '내용 (이슈)',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 1 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {params.value}
                    </Typography>
                    {params.row.attachment_urls && params.row.attachment_urls.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                            {params.row.attachment_urls.map((url, idx) => {
                                const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('token='); // 기본적인 이미지 체크
                                return isImage ? (
                                    <Box
                                        key={idx}
                                        component="img"
                                        src={url}
                                        alt={`attachment-${idx}`}
                                        sx={{ height: 80, width: 'auto', borderRadius: 1, cursor: 'pointer', border: '1px solid #ddd' }}
                                        onClick={() => window.open(url, '_blank')}
                                    />
                                ) : (
                                    <Chip
                                        key={idx}
                                        label={`첨부파일 ${idx + 1}`}
                                        size="small"
                                        component="a"
                                        href={url}
                                        target="_blank"
                                        clickable
                                        color="primary"
                                        variant="outlined"
                                    />
                                );
                            })}
                        </Box>
                    )}
                </Box>
            )
        },
        {
            field: 'status_priority',
            headerName: '상태/중요도',
            width: 140,
            renderCell: (params) => {
                const p = params.row.priority;
                const pColor = p === '긴급' ? 'error' : (p === '중요' ? 'warning' : (p === '일반' ? 'info' : 'default'));
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: 'calc(100% + 20px)', height: '100%', justifyContent: 'center', mx: '-10px' }}>
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', borderBottom: '1px solid #e0e0e0', px: '10px', py: 1 }}>
                            <Typography variant="caption" sx={{ width: 45, color: 'text.secondary' }}>상태:</Typography>
                            <Chip size="small" label={params.row.status} color="primary" variant="outlined" />
                        </Box>
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', px: '10px', py: 1 }}>
                            <Typography variant="caption" sx={{ width: 45, color: 'text.secondary' }}>중요도:</Typography>
                            <Chip size="small" label={p} color={pColor} variant="outlined" />
                        </Box>
                    </Box>
                );
            }
        },
        {
            field: 'managers',
            headerName: '등록/담당',
            width: 150,
            renderCell: (params) => {
                const assigneeNames = params.row.assignee_ids?.map(id => {
                    const user = usersOpts.find(u => u.id === id);
                    return user ? (user.name || user.email) : id;
                }).join(', ') || '미정';

                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: 'calc(100% + 20px)', height: '100%', justifyContent: 'center', mx: '-10px' }}>
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', borderBottom: '1px solid #e0e0e0', px: '10px', py: 1 }}>
                            <Typography variant="caption" sx={{ width: 35, color: 'text.secondary' }}>등록:</Typography>
                            <Typography variant="caption" noWrap>{params.row.creator_id || '알 수 없음'}</Typography>
                        </Box>
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', px: '10px', py: 1 }}>
                            <Typography variant="caption" sx={{ width: 35, color: 'text.secondary' }}>담당:</Typography>
                            <Typography variant="caption" noWrap>{assigneeNames}</Typography>
                        </Box>
                    </Box>
                );
            }
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
                        {cmList.map((cm, idx) => {
                            const cmUser = cm.owner_id ? usersOpts.find(u => u.id === cm.owner_id) : null;
                            const cmUserName = cmUser ? (cmUser.name || cmUser.email) : (cm.owner_id || '미정');
                            return (
                                <Box key={cm.id || idx} sx={{
                                    p: 1,
                                    bgcolor: 'background.default',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1
                                }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" fontWeight="bold">- 담당: {cmUserName}</Typography>
                                        <Typography variant="caption" color="primary">적용 V: {cm.apply_ver_id || 'N/A'}</Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {cm.description}
                                    </Typography>
                                    {cm.attachment_urls && cm.attachment_urls.length > 0 && (
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                            {cm.attachment_urls.map((url, i) => {
                                                const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('token=');
                                                return isImage ? (
                                                    <Box
                                                        key={`cm_att_${i}`}
                                                        component="img"
                                                        src={url}
                                                        alt={`cm-attachment-${i}`}
                                                        sx={{ height: 60, width: 'auto', borderRadius: 1, cursor: 'pointer', border: '1px solid #ddd' }}
                                                        onClick={(e) => { e.stopPropagation(); window.open(url, '_blank'); }}
                                                    />
                                                ) : (
                                                    <Chip
                                                        key={`cm_att_${i}`}
                                                        label={`첨부파일 ${i + 1}`}
                                                        size="small"
                                                        component="a"
                                                        href={url}
                                                        target="_blank"
                                                        clickable
                                                        color="secondary"
                                                        variant="outlined"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                );
                                            })}
                                        </Box>
                                    )}
                                </Box>
                            );
                        })}
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

    const handleOpenNewIssue = () => {
        window.open('/issues/new', 'IssuePopup', 'width=900,height=800,scrollbars=yes');
    };

    const handleOpenEditIssue = (id) => {
        window.open(`/issues/${id}/edit`, 'IssuePopup', 'width=900,height=800,scrollbars=yes');
    };

    return (
        <Box sx={{ height: 'calc(100vh - 100px)', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h5" fontWeight="bold">이슈 관리</Typography>
                    <Typography variant="body2" color="primary" sx={{ display: { xs: 'none', md: 'block' }, fontWeight: 'bold' }}>
                        💡 표의 행을 더블클릭하면 팝업창에서 내용을 수정하거나 대책을 추가할 수 있습니다.
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNewIssue} sx={{ whiteSpace: 'nowrap' }}>새 이슈 등록</Button>
            </Box>

            <Paper sx={{ flexGrow: 1, p: 1, width: '100%', overflow: 'hidden' }}>
                <DataGrid
                    rows={issues}
                    columns={columns}
                    loading={loading}
                    getRowHeight={() => 'auto'}
                    showCellVerticalBorder
                    showColumnVerticalBorder
                    paginationMode="server"
                    rowCount={rowCount}
                    pageSizeOptions={[30, 50, 100]}
                    paginationModel={paginationModel}
                    onPaginationModelChange={setPaginationModel}
                    onRowDoubleClick={(params) => handleOpenEditIssue(params.row.id)}
                    sx={{
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: '#f5f5f5',
                        },
                        '& .MuiDataGrid-row': { cursor: 'pointer' },
                        '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                />
            </Paper>
        </Box>
    );
}