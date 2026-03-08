import { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Box, MenuItem
} from '@mui/material';
import { supabase } from '../lib/supabase';

export default function IssueFormModal({ open, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        projects: '',
        modules: '',
        description: '',
        status: '등록',
        priority: 'Medium',
        assignees: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 현재 로그인된 사용자 정보 가져오기
            const { data: { user } } = await supabase.auth.getUser();
            const creatorName = user?.user_metadata?.full_name || user?.email || 'Unknown User';

            // 입력받은 배열형 데이터 파싱 (콤마 구분)
            const parseArray = (str) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];

            const newIssue = {
                project_names: parseArray(formData.projects),
                module_names: parseArray(formData.modules),
                description: formData.description,
                status: formData.status,
                priority: formData.priority,
                assignee_ids: parseArray(formData.assignees),
                creator_id: creatorName,
            };

            const { error } = await supabase
                .from('issues')
                .insert([newIssue]);

            if (error) throw error;

            // 폼 초기화 및 성공 콜백
            setFormData({
                projects: '',
                modules: '',
                description: '',
                status: '등록',
                priority: 'Medium',
                assignees: ''
            });
            if (onSuccess) onSuccess();
            onClose();

        } catch (error) {
            console.error("이슈 등록 실패:", error);
            alert("이슈 등록 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>새 이슈 등록</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            label="내용 (Description)"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            multiline
                            rows={3}
                            required
                            fullWidth
                        />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="프로젝트 (쉼표로 구분)"
                                name="projects"
                                value={formData.projects}
                                onChange={handleChange}
                                fullWidth
                                placeholder="ex) FW, UI"
                            />
                            <TextField
                                label="모듈 (쉼표로 구분)"
                                name="modules"
                                value={formData.modules}
                                onChange={handleChange}
                                fullWidth
                                placeholder="ex) 통신, 전원"
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                select
                                label="상태"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                fullWidth
                            >
                                <MenuItem value="등록">등록</MenuItem>
                                <MenuItem value="진행중">진행중</MenuItem>
                                <MenuItem value="해결됨">해결됨</MenuItem>
                                <MenuItem value="보류">보류</MenuItem>
                            </TextField>
                            <TextField
                                select
                                label="중요도"
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                                fullWidth
                            >
                                <MenuItem value="High">High</MenuItem>
                                <MenuItem value="Medium">Medium</MenuItem>
                                <MenuItem value="Low">Low</MenuItem>
                            </TextField>
                        </Box>
                        <TextField
                            label="담당자 (이름, 쉼표로 구분)"
                            name="assignees"
                            value={formData.assignees}
                            onChange={handleChange}
                            fullWidth
                            placeholder="ex) 홍길동, 김철수"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={loading}>취소</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        {loading ? '등록 중...' : '등록'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
