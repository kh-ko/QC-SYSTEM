import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

import Login from './pages/Login';
import Layout from './components/Layout';
import IssueList from './pages/IssueList';
import VersionManagement from './pages/VersionManagement';
import IssuePopup from './pages/IssuePopup';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true); // 로그인 상태 확인 중일 때의 로딩

  useEffect(() => {
    // 1. 처음 켜졌을 때 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. 로그인/로그아웃 상태가 변할 때마다 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 상태 확인 중이면 아무것도 안 그림 (깜빡임 방지)
  if (loading) return null;

  // 로그인이 안 되어 있다면 오직 로그인 화면만 허용
  if (!session) {
    return <Login />;
  }

  // 로그인이 되어 있다면 레이아웃과 내부 페이지들을 렌더링
  return (
    <Routes>
      <Route path="/" element={<Layout session={session} />}>
        {/* / 경로로 들어오면 자동으로 /issues 로 이동시킵니다 (대시보드 역할) */}
        <Route index element={<Navigate to="/issues" replace />} />
        <Route path="issues" element={<IssueList />} />
        <Route path="versions" element={<VersionManagement />} />
      </Route>
      {/* 팝업 전용 라우트 (Layout 미적용) */}
      <Route path="/issues/new" element={<IssuePopup />} />
      <Route path="/issues/:id/edit" element={<IssuePopup />} />
    </Routes>
  );
}