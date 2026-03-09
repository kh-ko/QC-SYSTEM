import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, TextField, Button, MenuItem, Typography, Chip, Select, OutlinedInput, InputLabel, FormControl, Paper, IconButton, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { supabase } from '../lib/supabase';

export default function IssuePopup() {
    const { id } = useParams();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditMode);
    const [usersOpts, setUsersOpts] = useState([]);
    const [projectsOpts, setProjectsOpts] = useState([]);
    const [modulesOpts, setModulesOpts] = useState([]);
    const [files, setFiles] = useState([]);

    const [formData, setFormData] = useState({
        projects: [], modules: [], description: '', status: '등록', priority: '일반', assignees: [], attachment_urls: []
    });

    const [countermeasures, setCountermeasures] = useState([]);

    useEffect(() => {
        const init = async () => {
            const { data: users } = await supabase.from('users').select('*');
            if (users) setUsersOpts(users);

            const { data: projectsData } = await supabase.from('projects').select('*');
            if (projectsData) setProjectsOpts(projectsData);

            const { data: modulesData } = await supabase.from('modules').select('*');
            if (modulesData) setModulesOpts(modulesData);

            if (isEditMode) {
                const { data: issue, error } = await supabase.from('issues').select('*, countermeasures(*)').eq('id', id).single();

                if (error) {
                    console.error("이슈 데이터 로드 실패:", error);
                }

                if (issue) {
                    setFormData({
                        projects: issue.project_names || [],
                        modules: issue.module_names || [],
                        description: issue.description || '',
                        status: issue.status || '등록',
                        priority: issue.priority || '일반',
                        assignees: issue.assignee_ids || [],
                        attachment_urls: issue.attachment_urls || []
                    });
                    const existingCM = (issue.countermeasures || []).map(cm => ({ ...cm, isEdited: false, isDeleted: false, attachment_urls: cm.attachment_urls || [], newFiles: [] }));
                    setCountermeasures(existingCM);
                }
                setFetching(false);
            }
        };
        init();
    }, [id, isEditMode]);

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles(prev => [...prev, ...droppedFiles]);
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                const file = new File([blob], `pasted_image_${Date.now()}.png`, { type: blob.type });
                setFiles(prev => [...prev, file]);
            }
        }
    };

    const handleIssueChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddCM = () => {
        setCountermeasures(prev => [...prev, { id: `temp_${Date.now()}`, description: '', owner_id: '', apply_ver_id: '', isNew: true, isDeleted: false, attachment_urls: [], newFiles: [] }]);
    };

    const handleCMFilesAdd = (cmId, selectedFiles) => {
        const fileArray = Array.from(selectedFiles);
        setCountermeasures(prev => prev.map(cm => cm.id === cmId ? { ...cm, newFiles: [...(cm.newFiles || []), ...fileArray], isEdited: !cm.isNew } : cm));
    };

    const handleCMRemoveNewFile = (cmId, fileIndex) => {
        setCountermeasures(prev => prev.map(cm => cm.id === cmId ? { ...cm, newFiles: cm.newFiles.filter((_, idx) => idx !== fileIndex), isEdited: !cm.isNew } : cm));
    };

    const handleCMRemoveExistingAttachment = (cmId, url) => {
        setCountermeasures(prev => prev.map(cm => cm.id === cmId ? { ...cm, attachment_urls: cm.attachment_urls.filter(u => u !== url), isEdited: true } : cm));
    };

    const handleCMChange = (cmId, field, value) => {
        setCountermeasures(prev => prev.map(cm => cm.id === cmId ? { ...cm, [field]: value, isEdited: !cm.isNew } : cm));
    };

    const handleDeleteCM = (cmId) => {
        setCountermeasures(prev => prev.map(cm => cm.id === cmId ? { ...cm, isDeleted: true } : cm));
    };

    const handleRemoveExistingAttachment = (url) => {
        setFormData(prev => ({ ...prev, attachment_urls: prev.attachment_urls.filter(u => u !== url) }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const creatorName = user?.user_metadata?.full_name || user?.email || 'Unknown';

            let newAttachmentUrls = [...formData.attachment_urls];

            // Upload files
            if (files.length > 0) {
                for (const file of files) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage.from('attachments').upload(fileName, file);
                    if (uploadError) {
                        alert(`파일 업로드 실패: ${file.name}`);
                        continue;
                    }
                    const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(fileName);
                    newAttachmentUrls.push(publicUrl);
                }
            }

            const issuePayload = {
                project_names: formData.projects,
                module_names: formData.modules,
                description: formData.description,
                status: formData.status,
                priority: formData.priority,
                assignee_ids: formData.assignees,
                attachment_urls: newAttachmentUrls
            };

            let currentIssueId = id;

            if (isEditMode) {
                // Update
                const { error: issueError } = await supabase.from('issues').update(issuePayload).eq('id', id);
                if (issueError) throw issueError;
            } else {
                // Insert
                issuePayload.creator_id = creatorName;
                const { data: newIssue, error: issueError } = await supabase.from('issues').insert([issuePayload]).select().single();
                if (issueError) throw issueError;
                currentIssueId = newIssue.id;
            }

            // CM logic
            for (const cm of countermeasures) {
                if (cm.isDeleted && !cm.isNew) {
                    await supabase.from('countermeasures').delete().eq('id', cm.id);
                } else if (!cm.isDeleted) {
                    let newCMAttachmentUrls = [...(cm.attachment_urls || [])];

                    // Upload new files for CM
                    if (cm.newFiles && cm.newFiles.length > 0) {
                        for (const file of cm.newFiles) {
                            const fileExt = file.name.split('.').pop();
                            const fileName = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                            const { error: uploadError } = await supabase.storage.from('attachments').upload(fileName, file);
                            if (!uploadError) {
                                const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(fileName);
                                newCMAttachmentUrls.push(publicUrl);
                            } else {
                                alert(`대책 파일 업로드 실패: ${file.name}`);
                            }
                        }
                    }

                    if (cm.isNew && (cm.description.trim() || newCMAttachmentUrls.length > 0)) {
                        await supabase.from('countermeasures').insert([{ issue_id: currentIssueId, description: cm.description, owner_id: cm.owner_id || null, apply_ver_id: cm.apply_ver_id || null, attachment_urls: newCMAttachmentUrls }]);
                    } else if (cm.isEdited) {
                        await supabase.from('countermeasures').update({ description: cm.description, owner_id: cm.owner_id || null, apply_ver_id: cm.apply_ver_id || null, attachment_urls: newCMAttachmentUrls }).eq('id', cm.id);
                    }
                }
            }

            if (window.opener) {
                window.opener.postMessage('refresh_issues', '*');
                window.close();
            } else {
                alert('저장되었습니다. 창을 닫아주세요.');
            }
        } catch (error) {
            console.error(error);
            alert("저장 실패");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <Box p={3}><Typography>데이터를 불러오는 중입니다...</Typography></Box>;

    return (
        <Box sx={{ p: 4, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
            <Paper component="form" onSubmit={handleSave} onPaste={handlePaste} sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" fontWeight="bold" color="primary">{isEditMode ? '이슈 정보 (수정)' : '새 이슈 등록'}</Typography>
                    <Typography variant="caption" color="text.secondary">창에서 저장 후 닫기</Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>프로젝트</InputLabel>
                        <Select multiple name="projects" value={formData.projects} onChange={handleIssueChange} input={<OutlinedInput label="프로젝트" />} renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((val) => <Chip key={val} label={val} size="small" />)}
                            </Box>
                        )}>
                            {projectsOpts.map((p) => <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth>
                        <InputLabel>모듈</InputLabel>
                        <Select multiple name="modules" value={formData.modules} onChange={handleIssueChange} input={<OutlinedInput label="모듈" />} renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((val) => <Chip key={val} label={val} size="small" />)}
                            </Box>
                        )}>
                            {modulesOpts.map((m) => <MenuItem key={m.id} value={m.name}>{m.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>담당자 (다중선택)</InputLabel>
                        <Select multiple name="assignees" value={formData.assignees} onChange={handleIssueChange} input={<OutlinedInput label="담당자 (다중선택)" />} renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((val) => {
                                    const u = usersOpts.find(user => user.id === val);
                                    return <Chip key={val} label={u ? (u.name || u.email) : val} size="small" />;
                                })}
                            </Box>
                        )}>
                            {usersOpts.map((u) => <MenuItem key={u.id} value={u.id}>{u.name || u.email}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth>
                        <InputLabel>상태</InputLabel>
                        <Select name="status" value={formData.status} onChange={handleIssueChange} input={<OutlinedInput label="상태" />}>
                            {['등록', '문제확인중', '수정중', '해결', '현상태유지', '보류'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth>
                        <InputLabel>중요도</InputLabel>
                        <Select name="priority" value={formData.priority} onChange={handleIssueChange} input={<OutlinedInput label="중요도" />}>
                            {['긴급', '중요', '일반', '경미', '검토'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>

                <TextField
                    label="이슈 내용 (여기에 이미지를 붙여넣거나 파일을 끌어다 놓으세요)"
                    name="description"
                    multiline minRows={4} required fullWidth
                    value={formData.description}
                    onChange={handleIssueChange}
                    inputProps={{ sx: { resize: 'vertical', overflow: 'auto !important' } }}
                />

                {/* 첨부파일 안내 및 표시 영역 */}
                <Box onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} sx={{ border: '2px dashed #ccc', p: 3, textAlign: 'center', bgcolor: '#fafafa', borderRadius: 1 }}>
                    <CloudUploadIcon color="disabled" sx={{ fontSize: 40 }} />
                    <Typography>새로운 파일을 여기로 드래그하거나, 클립보드 이미지를 Ctrl+V 하세요.</Typography>

                    {(formData.attachment_urls.length > 0 || files.length > 0) && (
                        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                            {formData.attachment_urls.map((url, i) => (
                                <Chip key={`ext_${i}`} label={`기존 첨부파일 ${i + 1}`} onDelete={() => handleRemoveExistingAttachment(url)} color="primary" variant="outlined" />
                            ))}
                            {files.map((f, i) => (
                                <Chip key={`new_${i}`} label={f.name} onDelete={() => setFiles(files.filter((_, idx) => idx !== i))} color="secondary" />
                            ))}
                        </Box>
                    )}
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" fontWeight="bold">대책 내역 (Countermeasures)</Typography>
                        <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddCM} size="small" variant="contained" color="secondary">대책 추가</Button>
                    </Box>

                    {countermeasures.filter(cm => !cm.isDeleted).map((cm) => (
                        <Paper key={cm.id} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, border: '1px solid #ddd' }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <FormControl sx={{ flex: 1 }}>
                                    <InputLabel>담당자</InputLabel>
                                    <Select value={cm.owner_id || ''} onChange={(e) => handleCMChange(cm.id, 'owner_id', e.target.value)} label="담당자">
                                        <MenuItem value=""><em>선택 안함</em></MenuItem>
                                        {usersOpts.map(u => <MenuItem key={u.id} value={u.id}>{u.name || u.email}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <TextField label="적용 V (버전)" sx={{ flex: 1 }} value={cm.apply_ver_id || ''} onChange={(e) => handleCMChange(cm.id, 'apply_ver_id', e.target.value)} />
                                <IconButton color="error" onClick={() => handleDeleteCM(cm.id)}><DeleteIcon /></IconButton>
                            </Box>
                            <TextField label="대책 내용" multiline minRows={2} fullWidth value={cm.description || ''} onChange={(e) => handleCMChange(cm.id, 'description', e.target.value)} inputProps={{ sx: { resize: 'vertical', overflow: 'auto !important' } }} />

                            {/* 대책 파일 첨부 영역 */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}>
                                    파일 첨부
                                    <input type="file" hidden multiple onChange={(e) => handleCMFilesAdd(cm.id, e.target.files)} />
                                </Button>
                                {cm.attachment_urls && cm.attachment_urls.map((url, i) => (
                                    <Chip key={`cm_ext_${i}`} label={`기존 첨부파일 ${i + 1}`} onDelete={() => handleCMRemoveExistingAttachment(cm.id, url)} color="primary" variant="outlined" size="small" />
                                ))}
                                {cm.newFiles && cm.newFiles.map((f, i) => (
                                    <Chip key={`cm_new_${i}`} label={f.name} onDelete={() => handleCMRemoveNewFile(cm.id, i)} color="secondary" size="small" />
                                ))}
                            </Box>
                        </Paper>
                    ))}

                    {countermeasures.filter(cm => !cm.isDeleted).length === 0 && (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>등록된 대책이 없습니다.</Typography>
                    )}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                    <Button variant="outlined" onClick={() => window.close()}>취소 및 창 닫기</Button>
                    <Button type="submit" variant="contained" disabled={loading}>{isEditMode ? '이슈 수정 저장' : '새 이슈 등록'}</Button>
                </Box>
            </Paper>
        </Box>
    );
}
