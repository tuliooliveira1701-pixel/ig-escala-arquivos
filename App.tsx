/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  DEFAULT_USERS, 
  DEFAULT_MINISTRIES, 
  DEFAULT_SCHEDULES, 
  DEFAULT_ASSIGNMENTS, 
  DEFAULT_SONGS, 
  generateMusicLinks
} from './dataStore';
import { AppUser, Ministry, Schedule, Assignment, Song, AppNotification, UserRole } from './types';

// Firebase imports
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from './firebase';

// Icons
import { 
  Bell, 
  ShieldAlert, 
  Users, 
  Award, 
  Calendar, 
  Music, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Sparkles, 
  ChevronDown, 
  Eye, 
  UserCheck, 
  Cross,
  Camera,
  Upload,
  Save,
  User
} from 'lucide-react';

// Subcomponents
import AdminPanel from './components/AdminPanel';
import LeaderPanel from './components/LeaderPanel';
import VolunteerPanel from './components/VolunteerPanel';
import NotificationCenter from './components/NotificationCenter';

// Supabase Edge Function for push delivery via OneSignal
const SUPABASE_PUSH_URL = 'https://mvtwfhdwfyxtbbqxaaep.supabase.co/functions/v1/send-push-notifications';
const SUPABASE_ANON_KEY = 'sb_publishable_4ZKJjZ0FrCK9t5KhLJJMAQ_61gjd-PK';

async function sendPushViaOneSignal(playerId: string | undefined, title: string, body: string) {
  if (!playerId) return;
  try {
    await fetch(SUPABASE_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ playerId, title, body }),
    });
  } catch (e) {
    console.warn('Erro ao disparar push via OneSignal:', e);
  }
}

export default function App() {
  // 1. Core database states synced with Firestore
  const [users, setUsers] = useState<AppUser[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // 2. Authentication and Loading states
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authRole, setAuthRole] = useState<UserRole>('volunteer');
  const [authMinistry, setAuthMinistry] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState('');

  // Keep admin credentials in memory to re-login after creating a new user
  const adminCredRef = React.useRef<{ email: string; password: string } | null>(null);

  // 3. Navigation
  const [activeTab, setActiveTab] = useState<'volunteer' | 'leader' | 'admin' | 'notifications'>('volunteer');

  // 4. Profile Custom Avatar variables
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');

  // Listen to Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Find or wait for the user doc in Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubUserDoc = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            setCurrentUser(snap.data() as AppUser);
          }
        });
        setLoading(false);
        return () => unsubUserDoc();
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync Real-Time Collections from Firestore of Active User
  useEffect(() => {
    if (!currentUser) {
      setUsers([]);
      setMinistries([]);
      setSchedules([]);
      setAssignments([]);
      setSongs([]);
      setNotifications([]);
      return;
    }

    // A. Users
    const unsubUsers = onSnapshot(collection(db, 'users'), 
      (snapshot) => {
        const list: AppUser[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as AppUser);
        });
        setUsers(list);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'users')
    );

    // B. Ministries
    const unsubMinistries = onSnapshot(collection(db, 'ministries'), 
      (snapshot) => {
        const list: Ministry[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Ministry);
        });
        if (list.length === 0 && currentUser.role === 'admin') {
          // Auto-seed initial default ministries
          DEFAULT_MINISTRIES.forEach(async (m) => {
            await setDoc(doc(db, 'ministries', m.id), m);
          });
        } else {
          setMinistries(list);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'ministries')
    );

    // C. Schedules
    const unsubSchedules = onSnapshot(collection(db, 'schedules'), 
      (snapshot) => {
        const list: Schedule[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Schedule);
        });
        if (list.length === 0 && currentUser.role === 'admin') {
          // Auto-seed initial default schedules
          DEFAULT_SCHEDULES.forEach(async (s) => {
            await setDoc(doc(db, 'schedules', s.id), s);
          });
        } else {
          setSchedules(list);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'schedules')
    );

    // D. Assignments
    const unsubAssignments = onSnapshot(collection(db, 'assignments'), 
      (snapshot) => {
        const list: Assignment[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Assignment);
        });
        setAssignments(list);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'assignments')
    );

    // E. Songs
    const unsubSongs = onSnapshot(collection(db, 'songs'), 
      (snapshot) => {
        const list: Song[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Song);
        });
        // Always update state first
        setSongs(list);
        // Seed defaults only when completely empty and user is admin
        if (list.length === 0 && currentUser.role === 'admin') {
          DEFAULT_SONGS.forEach(async (s) => {
            await setDoc(doc(db, 'songs', s.id), s);
          });
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'songs')
    );

    // F. Notifications (Filtered dynamically by modern Query Enforcer)
    const qNotifs = query(collection(db, 'notifications'), where('userId', '==', currentUser.id));
    const unsubNotifs = onSnapshot(qNotifs, 
      (snapshot) => {
        const list: AppNotification[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as AppNotification);
        });
        setNotifications(list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()));
      },
      (error) => handleFirestoreError(error, OperationType.GET, `notifications/${currentUser.id}`)
    );

    return () => {
      unsubUsers();
      unsubMinistries();
      unsubSchedules();
      unsubAssignments();
      unsubSongs();
      unsubNotifs();
    };
  }, [currentUser]);

  // ── Automatic 24h reminder checker ────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') return;

    const sendReminder24h = async () => {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in26h = new Date(now.getTime() + 26 * 60 * 60 * 1000); // 2h window to avoid duplicates

      const myAssignments = assignments.filter(a => a.volunteerId === currentUser.id);

      for (const asg of myAssignments) {
        const sch = schedules.find(s => s.id === asg.scheduleId);
        if (!sch || sch.status !== 'published') continue;

        const eventTime = new Date(sch.eventDate);
        // Check if event falls within the 24–26h window
        if (eventTime >= in24h && eventTime <= in26h) {
          const notifId = `notif-24h-${asg.id}-${eventTime.toDateString()}`;

          // Check if this reminder was already sent (avoid duplicates)
          const alreadySent = notifications.some(n => n.id === notifId);
          if (alreadySent) continue;

          const formattedDate = eventTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
          const formattedTime = eventTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          const notif: AppNotification = {
            id: notifId,
            userId: currentUser.id,
            title: '⏰ Lembrete: Escala Amanhã!',
            message: `Você está escalado como "${asg.roleInMinistry}" no evento "${sch.title}" — ${formattedDate} às ${formattedTime}. Confirme sua presença!`,
            type: 'reminder_24h',
            scheduleId: sch.id,
            sentAt: new Date().toISOString(),
            isRead: false
          };

          try {
            await setDoc(doc(db, 'notifications', notifId), notif);
            // Dispara o push real via OneSignal
            sendPushViaOneSignal(
              currentUser.onesignalPlayerId,
              notif.title,
              notif.message
            );
          } catch (e) {
            console.error('Erro ao enviar lembrete 24h:', e);
          }
        }
      }
    };

    // Run immediately on login and then every 30 minutes
    sendReminder24h();
    const interval = setInterval(sendReminder24h, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser, assignments, schedules, notifications]);

  // ── OneSignal Push Notifications ──────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const setupOneSignalPlayerId = async () => {
      try {
        // Aguarda o SDK do OneSignal estar disponível (carregado via index.html)
        let attempts = 0;
        while (!(window as any).OneSignal && attempts < 20) {
          await new Promise(r => setTimeout(r, 300));
          attempts++;
        }

        const OneSignalDeferred = (window as any).OneSignalDeferred || [];
        (window as any).OneSignalDeferred = OneSignalDeferred;

        OneSignalDeferred.push(async (OneSignal: any) => {
          try {
            // Pede permissão de notificação (se ainda não concedida)
            const permission = await OneSignal.Notifications.permission;
            if (!permission) {
              await OneSignal.Notifications.requestPermission();
            }

            // Pega o ID de inscrição (Player ID / Subscription ID) do navegador atual
            const playerId = OneSignal.User.PushSubscription.id;

            if (playerId && playerId !== currentUser.onesignalPlayerId) {
              await setDoc(doc(db, 'users', currentUser.id), { onesignalPlayerId: playerId }, { merge: true });
            }
          } catch (innerErr) {
            console.warn('OneSignal player id error:', innerErr);
          }
        });
      } catch (e) {
        console.warn('OneSignal setup error:', e);
      }
    };

    setupOneSignalPlayerId();
  }, [currentUser?.id]);


  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (isSignUp) {
      if (!authName || !authEmail || !authPassword) {
        setAuthError('Todos os campos são obrigatórios.');
        return;
      }
      
      createUserWithEmailAndPassword(auth, authEmail, authPassword)
        .then(async (userCredential) => {
          const uid = userCredential.user.uid;
          // Save credentials for re-auth after creating other users
          adminCredRef.current = { email: authEmail, password: authPassword };
          const newUser: AppUser = {
            id: uid,
            name: authName,
            email: authEmail.toLowerCase(),
            role: authRole,
            ministryIds: authMinistry ? [authMinistry] : [],
            joinedAt: new Date().toISOString()
          };
          if (authMinistry) {
            newUser.ministryId = authMinistry;
          }
          
          await setDoc(doc(db, 'users', uid), newUser);

          // Welcome notification
          const welcomeNotification: AppNotification = {
            id: `not-welcome-${Date.now()}`,
            userId: uid,
            title: 'Bem-vindo ao IG Escala!',
            message: `Sua conta para ${newUser.email} foi criada com sucesso com o cargo de ${newUser.role === 'admin' ? 'Administrador' : newUser.role === 'leader' ? 'Líder' : 'Voluntário'}.`,
            type: 'system',
            sentAt: new Date().toISOString(),
            isRead: false
          };
          try {
            await setDoc(doc(db, 'notifications', welcomeNotification.id), welcomeNotification);
          } catch (notifError) {
            console.warn("Não foi possível criar notificação de boas-vindas devido às regras de segurança:", notifError);
          }

          // Set active view
          if (newUser.role === 'admin') setActiveTab('admin');
          else if (newUser.role === 'leader') setActiveTab('leader');
          else setActiveTab('volunteer');

          setAuthName('');
          setAuthEmail('');
          setAuthPassword('');
        })
        .catch((err) => {
          console.error("Erro detalhado de cadastro do Firebase:", err);
          if (err.code === 'auth/email-already-in-use') {
            setAuthError('E-mail já cadastrado.');
          } else if (err.code === 'auth/weak-password') {
            setAuthError('A senha deve conter no mínimo 6 caracteres.');
          } else {
            setAuthError(`Erro ao realizar cadastro: ${err.message || err}`);
          }
        });
    } else {
      // Login mode
      if (!authEmail || !authPassword) {
        setAuthError('Informe o e-mail e a senha de acesso.');
        return;
      }

      signInWithEmailAndPassword(auth, authEmail, authPassword)
        .then((userCredential) => {
          // Save credentials so we can re-login after creating another user
          adminCredRef.current = { email: authEmail, password: authPassword };
          // Firestore snap handles setting the state
          const uid = userCredential.user.uid;
          // Temp check to route
          onSnapshot(doc(db, 'users', uid), (snap) => {
            if (snap.exists()) {
              const u = snap.data() as AppUser;
              if (u.role === 'admin') setActiveTab('admin');
              else if (u.role === 'leader') setActiveTab('leader');
              else setActiveTab('volunteer');
            }
          });
        })
        .catch((err) => {
          console.error("Erro detalhado de login do Firebase:", err);
          setAuthError('E-mail de acesso ou senha inválida.');
        });
    }
  };

  // Trigger 1 Actions: Immediate notification when schedule status transitions to published
  const handleUpdateScheduleStatus = async (scheduleId: string, status: Schedule['status']) => {
    try {
      await setDoc(doc(db, 'schedules', scheduleId), { status }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `schedules/${scheduleId}`);
    }

    if (status === 'published') {
      const sch = schedules.find(s => s.id === scheduleId);
      if (!sch) return;

      const formattedDate = new Date(sch.eventDate).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
      const formattedTime = new Date(sch.eventDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const targetAssignments = assignments.filter(a => a.scheduleId === scheduleId);

      targetAssignments.forEach(async (asg) => {
        // Use stable ID (no Date.now) so re-publishing doesn't spam
        const uniqueNotifId = `notif-published-${asg.id}`;
        const pushTitle = '📅 Nova Escala Publicada!';
        const pushMessage = `Você foi escalado como "${asg.roleInMinistry}" no evento "${sch.title}" — ${formattedDate} às ${formattedTime}. Confirme sua presença no app.`;
        const newNotif: AppNotification = {
          id: uniqueNotifId,
          userId: asg.volunteerId,
          title: pushTitle,
          message: pushMessage,
          type: 'new_schedule',
          scheduleId: sch.id,
          sentAt: new Date().toISOString(),
          isRead: false
        };
        try {
          await setDoc(doc(db, 'notifications', uniqueNotifId), newNotif);
          // Dispara o push real via OneSignal
          const volunteerUser = users.find(u => u.id === asg.volunteerId);
          sendPushViaOneSignal(volunteerUser?.onesignalPlayerId, pushTitle, pushMessage);
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, `notifications/${uniqueNotifId}`);
        }
      });
    }
  };

  // Trigger 2 & 3 Actions (Simulated: 24h & 2h reminders) via Database controls
  const handleSimulateReminder = (scheduleId: string, type: 'reminder_24h' | 'reminder_2h' | 'new_schedule') => {
    const sch = schedules.find(s => s.id === scheduleId);
    if (!sch) return;

    const scaleAssignments = assignments.filter(a => a.scheduleId === scheduleId);
    if (scaleAssignments.length === 0) return;

    const formattedTime = new Date(sch.eventDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const formattedDate = new Date(sch.eventDate).toLocaleDateString('pt-BR');

    scaleAssignments.forEach(async (asg) => {
      let title = '';
      let message = '';

      if (type === 'new_schedule') {
        title = 'Nova Escala Publicada 📅';
        message = `Você foi escalado como "${asg.roleInMinistry}" no culto "${sch.title}" em ${formattedDate}.`;
      } else if (type === 'reminder_24h') {
        title = '⏱️ Lembrete: Escala de Amanhã (24h)';
        message = `Atenção: A escala de "${sch.title}" acontecerá amanhã às ${formattedTime}. Confirme ou informe sua ausência se necessário.`;
      } else {
        title = '🚨 Escala Inicia em 2 Horas!';
        message = `Aviso Emergência: Sua escala para "${asg.roleInMinistry}" no culto de hoje começa em 2 horas (${formattedTime}).`;
      }

      const notifId = `not-sim-${type}-${asg.id}-${Date.now()}`;
      const newNotif: AppNotification = {
        id: notifId,
        userId: asg.volunteerId,
        title,
        message,
        type,
        scheduleId: sch.id,
        sentAt: new Date().toISOString(),
        isRead: false
      };
      
      try {
        await setDoc(doc(db, 'notifications', notifId), newNotif);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `notifications/${notifId}`);
      }
    });
  };

  // Profile Avatar Update handler
  const handleUpdateProfileAvatar = async (avatarUrl: string, name?: string) => {
    if (!currentUser) return;
    const updatedName = name || currentUser.name;
    try {
      await setDoc(doc(db, 'users', currentUser.id), { avatarUrl, name: updatedName }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.id}`);
    }
  };

  // Core administrative events
  const handleAddUser = async (userData: Omit<AppUser, 'id' | 'joinedAt'>, password?: string, ministryIds?: string[]) => {
    const tempPassword = password || 'Igreja@123';
    const savedAdminCreds = adminCredRef.current;

    try {
      // 1. Create Firebase Auth account
      const credential = await createUserWithEmailAndPassword(auth, userData.email, tempPassword);
      const newUid = credential.user.uid;

      const resolvedMinistryIds = ministryIds && ministryIds.length > 0
        ? ministryIds
        : (userData.ministryId ? [userData.ministryId] : []);

      const newUser: AppUser = {
        ...userData,
        id: newUid,
        ministryId: resolvedMinistryIds[0] || undefined,
        ministryIds: resolvedMinistryIds,
        joinedAt: new Date().toISOString()
      };
      if (!newUser.ministryId) delete newUser.ministryId;

      // 2. Re-login as admin FIRST so Firestore write happens with admin permissions
      if (savedAdminCreds) {
        await signInWithEmailAndPassword(auth, savedAdminCreds.email, savedAdminCreds.password);
      }

      // 3. Now write to Firestore as admin
      await setDoc(doc(db, 'users', newUid), newUser);

      setActiveTab('admin');
      alert(`✅ Usuário "${userData.name}" criado com sucesso!\n\nE-mail: ${userData.email}\nSenha: ${tempPassword}\n\nCompartilhe essas informações com o servo.`);

    } catch (e: any) {
      // Ensure admin is re-logged in even on error
      if (savedAdminCreds) {
        try { await signInWithEmailAndPassword(auth, savedAdminCreds.email, savedAdminCreds.password); } catch {}
      }
      const code = e?.code || '';
      if (code === 'auth/email-already-in-use') {
        alert('❌ Este e-mail já está cadastrado no Firebase. O servo já tem acesso — verifique se o perfil existe no Firestore.');
      } else if (code === 'auth/weak-password') {
        alert('❌ Senha muito fraca. Use ao menos 6 caracteres.');
      } else if (code === 'auth/invalid-email') {
        alert('❌ E-mail inválido. Verifique o endereço digitado.');
      } else if (code === 'permission-denied' || (e?.message || '').includes('permission')) {
        alert('❌ Permissão negada pelo Firestore.\n\nO usuário foi criado no Firebase Auth mas o perfil não foi salvo.\nAcesse o console do Firebase → Firestore → Regras e permita escrita autenticada na coleção "users".');
      } else {
        const msg = e?.message || String(e);
        alert(`❌ Erro ao criar usuário:\n${msg}`);
        console.error('handleAddUser error:', e);
      }
    }
  };

  const handleUpdateUserRole = async (id: string, role: AppUser['role'], ministryId?: string) => {
    try {
      await setDoc(doc(db, 'users', id), { role, ministryId: ministryId || null }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${id}`);
    }
  };

  const handleUpdateUserMinistries = async (userId: string, ministryIds: string[]) => {
    try {
      const primary = ministryIds[0] || null;
      await setDoc(doc(db, 'users', userId), { ministryIds, ministryId: primary }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser?.id) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      
      ministries.forEach(async (m) => {
        if (m.leaderId === id) {
          await setDoc(doc(db, 'ministries', m.id), { leaderId: null }, { merge: true });
        }
      });
      
      assignments.forEach(async (a) => {
        if (a.volunteerId === id) {
          await deleteDoc(doc(db, 'assignments', a.id));
        }
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${id}`);
    }
  };

  const handleAddMinistry = async (name: string, description: string, leaderId?: string) => {
    const newId = `min-${Date.now()}`;
    const newMin: Ministry = {
      id: newId,
      name,
      description,
      createdAt: new Date().toISOString()
    };
    if (leaderId) {
      newMin.leaderId = leaderId;
    }
    
    try {
      await setDoc(doc(db, 'ministries', newId), newMin);

      if (leaderId) {
        await setDoc(doc(db, 'users', leaderId), { role: 'leader', ministryId: newId }, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `ministries/${newId}`);
    }
  };

  const handleDeleteMinistry = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'ministries', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `ministries/${id}`);
    }
  };

  const handleUpdateMinistryRoles = async (ministryId: string, roles: string[]) => {
    try {
      await setDoc(doc(db, 'ministries', ministryId), { rolesInMinistry: roles }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `ministries/${ministryId}`);
    }
  };

  // Schedule / Band events
  const handleAddSchedule = async (scheduleData: Omit<Schedule, 'id' | 'createdAt'>) => {
    const newId = `sch-${Date.now()}`;
    const newSch: Schedule = {
      ...scheduleData,
      id: newId,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'schedules', newId), newSch);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `schedules/${newId}`);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'schedules', id));
      
      assignments.forEach(async (a) => {
        if (a.scheduleId === id) {
          await deleteDoc(doc(db, 'assignments', a.id));
        }
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `schedules/${id}`);
    }
  };

  // Volunteer confirmation
  const handleConfirmAssignment = async (id: string, status: Assignment['status'], justification?: string) => {
    try {
      const update: Partial<Assignment> = { status };
      if (justification !== undefined) update.justification = justification;
      await setDoc(doc(db, 'assignments', id), update, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `assignments/${id}`);
    }
  };

  const handleAddAssignment = async (asgData: Omit<Assignment, 'id' | 'createdAt'>) => {
    const isDuplicate = assignments.some(a => a.scheduleId === asgData.scheduleId && a.volunteerId === asgData.volunteerId);
    if (isDuplicate) return;

    const newId = `asg-${Date.now()}`;
    const newAsg: Assignment = {
      ...asgData,
      id: newId,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'assignments', newId), newAsg);

      const sch = schedules.find(s => s.id === asgData.scheduleId);
      if (sch && sch.status === 'published') {
        const ministry = ministries.find(m => m.id === sch.ministryId);
        const formattedDate = new Date(sch.eventDate).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
        const formattedTime = new Date(sch.eventDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const notifId = `notif-asg-${newId}`;
        const pushTitle = '📅 Você foi escalado!';
        const pushMessage = `Você foi escalado como "${asgData.roleInMinistry}"${ministry ? ` no ${ministry.name}` : ''} — "${sch.title}" — ${formattedDate} às ${formattedTime}. Confirme sua presença no app.`;
        const pathNotif: AppNotification = {
          id: notifId,
          userId: asgData.volunteerId,
          title: pushTitle,
          message: pushMessage,
          type: 'new_schedule',
          scheduleId: sch.id,
          sentAt: new Date().toISOString(),
          isRead: false
        };
        await setDoc(doc(db, 'notifications', notifId), pathNotif);
        // Dispara o push real via OneSignal
        const volunteerUser = users.find(u => u.id === asgData.volunteerId);
        sendPushViaOneSignal(volunteerUser?.onesignalPlayerId, pushTitle, pushMessage);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `assignments/${newId}`);
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'assignments', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `assignments/${id}`);
    }
  };

  // Repertoire
  const handleAddSong = async (songData: Omit<Song, 'id' | 'createdAt'>) => {
    const newId = `song-${Date.now()}`;
    const newSong: Song = {
      ...songData,
      id: newId,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'songs', newId), newSong);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `songs/${newId}`);
    }
  };

  const handleRemoveSong = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'songs', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `songs/${id}`);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await setDoc(doc(db, 'notifications', id), { isRead: true }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const handleClearAllNotifs = () => {
    if (currentUser) {
      notifications.forEach(async (n) => {
        if (n.userId === currentUser.id) {
          try {
            await deleteDoc(doc(db, 'notifications', n.id));
          } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, `notifications/${n.id}`);
          }
        }
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setActiveTab('volunteer');
    } catch (e) {
      console.error("Logout Error", e);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#120E3D]/95 min-h-screen flex flex-col items-center justify-center p-4 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#06B6D4] mb-4"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#A5B4FC]">Carregando IG Escala...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="bg-gradient-to-br from-[#120E3D] via-[#241442] to-[#0A071E] min-h-screen flex items-center justify-center p-4 font-sans antialiased text-white relative overflow-hidden">
        {/* Decorative Concentric Rings mimicking the image background */}
        <div className="absolute top-[-20%] right-[-10%] w-[350px] h-[350px] rounded-full border border-white/5 pointer-events-none"></div>
        <div className="absolute top-[-15%] right-[-5%] w-[280px] h-[280px] rounded-full border border-white/5 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full border border-white/5 pointer-events-none"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[300px] h-[300px] rounded-full border border-white/5 pointer-events-none"></div>

        <div className="bg-[#1C164D]/80 backdrop-blur-xl rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl border border-white/10 space-y-6 relative z-10 animate-in fade-in zoom-in duration-200">
          <div className="text-center space-y-2.5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto shadow-xl">
              <img src="/icon.png" alt="IG Escala" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-extrabold tracking-tight text-3xl uppercase leading-none">
                <span className="text-[#06B6D4]">IG</span> <span className="text-white">ESCALA</span>
              </h1>
              <p className="text-[10px] text-[#A5B4FC] font-extrabold uppercase tracking-widest pt-1">Gestão de Escalas Ministeriais</p>
            </div>
            <p className="text-xs text-[#94A3B8]">
              {isSignUp 
                ? 'Preencha os dados abaixo para cadastrar seu perfil.' 
                : 'Acesse a plataforma de escala para verificar suas convocações.'}
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-500/10 text-red-300 text-xs font-semibold rounded-2xl border border-red-500/20 text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs text-white">
            {isSignUp && (
              <>
                <div className="space-y-1">
                  <label className="block font-bold text-[#A5B4FC] uppercase tracking-wider text-[10px]">Nome Completo</label>
                  <input
                    type="text"
                    placeholder="Ex: Desenvolvedor"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full text-xs p-3 border border-white/10 rounded-2xl bg-[#120E3D]/50 focus:bg-[#120E3D]/80 focus:ring-2 focus:ring-[#06B6D4] focus:outline-none transition-all placeholder-white/30"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-bold text-[#A5B4FC] uppercase tracking-wider text-[10px]">Cargo Desejado</label>
                    <select
                      value={authRole}
                      onChange={(e) => setAuthRole(e.target.value as any)}
                      className="w-full text-xs p-3 border border-white/10 rounded-2xl bg-[#120E3D]/50 focus:bg-[#120E3D]/80 focus:outline-none cursor-pointer font-bold select-none text-white transition-all [&>option]:bg-[#120E3D]"
                    >
                      <option value="volunteer">Servo / Voluntário</option>
                      <option value="leader">Líder de Ministério</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-[#A5B4FC] uppercase tracking-wider text-[10px]">Ministério</label>
                    <select
                      value={authMinistry}
                      onChange={(e) => setAuthMinistry(e.target.value)}
                      className="w-full text-xs p-3 border border-white/10 rounded-2xl bg-[#120E3D]/50 focus:bg-[#120E3D]/80 focus:outline-none cursor-pointer font-bold select-none text-white transition-all [&>option]:bg-[#120E3D]"
                    >
                      <option value="">Geral / Sem Min.</option>
                      {ministries.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="block font-bold text-[#A5B4FC] uppercase tracking-wider text-[10px]">Endereço de E-mail</label>
              <input
                type="email"
                placeholder="Ex: seuemail@igreja.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full text-xs p-3 border border-white/10 rounded-2xl bg-[#120E3D]/50 focus:bg-[#120E3D]/80 focus:ring-2 focus:ring-[#06B6D4] focus:outline-none transition-all placeholder-white/30 text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-[#A5B4FC] uppercase tracking-wider text-[10px]">Senha de Acesso</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Sua senha"
                className="w-full text-xs p-3 border border-white/10 rounded-2xl bg-[#120E3D]/50 focus:bg-[#120E3D]/80 focus:ring-2 focus:ring-[#06B6D4] focus:outline-none transition-all placeholder-white/30 text-white"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 bg-[#4C3BCF] hover:bg-[#3B28B8] text-white font-extrabold rounded-2xl transition-all shadow-xl shadow-indigo-950 cursor-pointer text-xs uppercase tracking-wider"
              >
                {isSignUp ? 'Criar Conta' : 'Entrar na Plataforma'}
              </button>
            </div>

            <p className="text-center text-[11px] pt-1 text-[#94A3B8]">
              {isSignUp ? 'Já tem uma conta?' : 'Quer se cadastrar na plataforma?'} {' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError('');
                }}
                className="text-[#06B6D4] hover:underline font-black cursor-pointer uppercase tracking-wider text-[11px] ml-1"
              >
                {isSignUp ? 'Acesse sua conta' : 'Crie uma conta nova'}
              </button>
            </p>
          </form>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => n.userId === currentUser.id && !n.isRead).length;

  return (
    <div className="bg-natural-bg min-h-screen flex flex-col font-sans select-none antialiased text-natural-text">

      {/* Primary Header */}
      <header className="bg-white border-b border-natural-border sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 s:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('volunteer')}>
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm shrink-0">
              <img src="/icon.png" alt="IG Escala" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 tracking-tight text-lg leading-tight uppercase"><span className="text-natural-orange">IG</span> <span className="text-natural-primary">ESCALA</span></h1>
              <p className="text-[10px] text-natural-text font-bold leading-none uppercase">Escalas Ministeriais</p>
            </div>
          </div>

          {/* Nav Tabs adaptive */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-bold">
            <button
              onClick={() => setActiveTab('volunteer')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'volunteer' 
                  ? 'bg-natural-primary text-white shadow-xs' 
                  : 'text-natural-text hover:bg-natural-sidebar hover:text-natural-primary'
              }`}
            >
              Meu Painel
            </button>

            {currentUser.role !== 'volunteer' && (
              <button
                onClick={() => setActiveTab('leader')}
                className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'leader' 
                    ? 'bg-natural-primary text-white shadow-xs' 
                    : 'text-natural-text hover:bg-natural-sidebar hover:text-natural-primary'
                }`}
              >
                Gerenciar Escalas
              </button>
            )}

            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'admin' 
                    ? 'bg-natural-primary text-white shadow-xs' 
                    : 'text-natural-text hover:bg-natural-sidebar hover:text-natural-primary'
                }`}
              >
                Ministérios & Direção
              </button>
            )}
          </nav>

          {/* User Controls / Session Badge */}
          <div className="flex items-center gap-3">
            
            {/* Notification Bell Badge */}
            <button
              onClick={() => setActiveTab('notifications')}
              className="p-2 text-natural-text hover:bg-natural-sidebar rounded-xl transition-colors relative cursor-pointer"
              title="Avisos e Lembretes"
            >
              <Bell className="w-5 h-5 text-natural-primary" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-natural-orange text-white font-black text-[9px] rounded-full flex items-center justify-center animate-pulse leading-none">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Email Logins trigger */}
            <div className="flex items-center gap-3 border-l border-natural-border pl-3">
              {/* Profile Avatar Clickable Trigger */}
              <button
                onClick={() => {
                  setProfileAvatarUrl(currentUser.avatarUrl || '');
                  setShowProfileModal(true);
                }}
                className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-[#4C3BCF] to-[#06B6D4] p-0.5 shadow-md hover:scale-115 active:scale-95 transition-all cursor-pointer flex items-center justify-center group shrink-0"
                title="Minha Foto & Perfil"
              >
                {currentUser.avatarUrl ? (
                  <img 
                    src={currentUser.avatarUrl} 
                    alt={currentUser.name} 
                    className="w-full h-full object-cover rounded-full bg-[#EFEFF6]" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-black">
                    {currentUser.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                {/* Micro edit trigger icon */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </button>

              <div 
                className="hidden sm:block text-left cursor-pointer" 
                onClick={() => { 
                  setProfileAvatarUrl(currentUser.avatarUrl || ''); 
                  setShowProfileModal(true); 
                }} 
                title="Editar Perfil"
              >
                <span className="text-slate-900 font-extrabold text-xs block leading-none hover:text-[#4C3BCF] transition-colors">{currentUser.name}</span>
                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full mt-1.5 inline-block ${
                  currentUser.role === 'admin'
                    ? 'bg-rose-100 text-rose-700'
                    : currentUser.role === 'leader'
                    ? 'bg-indigo-100 text-[#4C3BCF]'
                    : 'bg-[#06B6D4]/15 text-[#06B6D4]'
                }`}>
                  {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'leader' ? 'Líder' : 'Voluntário'}
                </span>
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 text-natural-text hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer ml-1"
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile nav indicator bar */}
      <div className="md:hidden bg-white border-b border-natural-border flex py-2 px-4 justify-around text-xs font-bold shadow-xs">
        <button
          onClick={() => setActiveTab('volunteer')}
          className={`flex-1 py-1.5 text-center rounded-lg ${activeTab === 'volunteer' ? 'bg-natural-primary text-white' : 'text-natural-text hover:bg-natural-sidebar'}`}
        >
          Painel
        </button>
        {currentUser.role !== 'volunteer' && (
          <button
            onClick={() => setActiveTab('leader')}
            className={`flex-1 py-1.5 text-center rounded-lg ${activeTab === 'leader' ? 'bg-natural-primary text-white' : 'text-natural-text hover:bg-natural-sidebar'}`}
          >
            Liderar
          </button>
        )}
        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 py-1.5 text-center rounded-lg ${activeTab === 'admin' ? 'bg-natural-primary text-white' : 'text-natural-text hover:bg-natural-sidebar'}`}
          >
            Direção
          </button>
        )}

      </div>

      {/* Core Body routing tabs */}
      <main className="flex-1 bg-natural-bg">
        {activeTab === 'volunteer' && (
          <VolunteerPanel
            currentUser={currentUser}
            users={users}
            ministries={ministries}
            schedules={schedules}
            assignments={assignments}
            songs={songs}
            onConfirmAssignment={handleConfirmAssignment}
          />
        )}

        {activeTab === 'leader' && currentUser.role !== 'volunteer' && (
          <LeaderPanel
            currentUser={currentUser}
            users={users}
            ministries={ministries}
            schedules={schedules}
            assignments={assignments}
            songs={songs}
            onAddSchedule={handleAddSchedule}
            onUpdateScheduleStatus={handleUpdateScheduleStatus}
            onDeleteSchedule={handleDeleteSchedule}
            onAddAssignment={handleAddAssignment}
            onRemoveAssignment={handleRemoveAssignment}
            onAddSong={handleAddSong}
            onRemoveSong={handleRemoveSong}
          />
        )}

        {activeTab === 'admin' && currentUser?.role === 'admin' && (
          <AdminPanel
            users={users}
            ministries={ministries}
            onAddUser={handleAddUser}
            onUpdateUserRole={handleUpdateUserRole}
            onUpdateUserMinistries={handleUpdateUserMinistries}
            onAddMinistry={handleAddMinistry}
            onDeleteMinistry={handleDeleteMinistry}
            onUpdateMinistryRoles={handleUpdateMinistryRoles}
            onDeleteUser={handleDeleteUser}
            currentUser={currentUser}
          />
        )}



        {activeTab === 'notifications' && (
          <NotificationCenter
            notifications={notifications}
            users={users}
            schedules={schedules}
            currentUser={currentUser}
            onMarkRead={handleMarkRead}
            onClearAll={handleClearAllNotifs}
            onSimulateReminder={handleSimulateReminder}
          />
        )}
      </main>

      {/* Authentication / SignUp Simulation Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-natural-border animate-in fade-in zoom-in duration-100 space-y-4">
            
            <div className="text-center space-y-1">
              <div className="w-10 h-10 bg-natural-sidebar text-natural-primary rounded-full flex items-center justify-center mx-auto text-sm">
                <LogIn className="w-5 h-5 text-natural-orange" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase">Acesso IG Escala</h3>
              <p className="text-xs text-natural-text">Cadastre um novo voluntário ou entre com uma das contas de teste.</p>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-100">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5 text-xs text-natural-text">
              
              {isSignUp && (
                <>
                  <div>
                    <label className="block font-bold text-natural-primary uppercase mb-1">Nome Completo</label>
                    <input
                      type="text"
                      placeholder="Ex: João da Silva"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-light focus:bg-white focus:ring-2 focus:ring-natural-primary focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-natural-primary mb-1 uppercase">Cargo Desejado</label>
                      <select
                        value={authRole}
                        onChange={(e) => setAuthRole(e.target.value as any)}
                        className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-light focus:bg-white focus:outline-none"
                      >
                        <option value="volunteer">Servo / Voluntário</option>
                        <option value="leader">Líder de Ministério</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-natural-primary mb-1 uppercase">Ministério Ativa</label>
                      <select
                        value={authMinistry}
                        onChange={(e) => setAuthMinistry(e.target.value)}
                        className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-light focus:bg-white focus:outline-none"
                      >
                        <option value="">Nenhum / Geral</option>
                        {ministries.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block font-bold text-natural-primary uppercase mb-1">Endereço de E-mail</label>
                <input
                  type="email"
                  placeholder="Seu email@igreja.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-light focus:bg-white focus:ring-2 focus:ring-natural-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-natural-primary uppercase mb-1">Senha Secreta</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Sua senha secreta de e-mail"
                  className="w-full text-xs p-2.5 border border-natural-border rounded-xl bg-natural-light focus:bg-white focus:ring-2 focus:ring-natural-primary focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-natural-primary hover:bg-[#3D4D3F] text-white font-bold rounded-xl transition-colors shadow-sm cursor-pointer text-xs uppercase"
                >
                  {isSignUp ? 'Realizar Cadastro' : 'Entrar na Plataforma'}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-natural-primary hover:underline font-semibold cursor-pointer"
                >
                  {isSignUp ? 'Já possui conta? Entre' : 'Não possui cadastro? Crie uma conta'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="text-[#8E8A82] hover:text-[#5C5850] font-semibold cursor-pointer"
                >
                  Fechar Janela
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Profile Area & Avatar Configuration Modal */}
      {showProfileModal && currentUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#1C164D] text-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl border border-white/25 space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Concentric rings decoration inside modal */}
            <div className="absolute top-[-20%] right-[-10%] w-[250px] h-[250px] rounded-full border border-white/5 pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[200px] h-[200px] rounded-full border border-white/5 pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#4C3BCF] to-[#06B6D4] flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight uppercase">Área do Voluntário</h3>
                  <p className="text-[10px] text-[#A5B4FC] font-bold uppercase tracking-wider">Configure sua foto de perfil</p>
                </div>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="text-white/60 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Voltar
              </button>
            </div>

            {/* Main profile view */}
            <div className="space-y-4 relative z-10">
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-[#120E3D]/50 p-5 rounded-2xl border border-white/5">
                
                {/* Large Profile Image Showcase */}
                <div className="relative w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#4C3BCF] via-[#8B5CF6] to-[#06B6D4] shadow-lg shrink-0">
                  {profileAvatarUrl ? (
                    <img 
                      src={profileAvatarUrl} 
                      alt="Sua foto" 
                      className="w-full h-full object-cover rounded-full bg-[#120E3D]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-white/50 text-2xl font-black">
                      {currentUser.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#06B6D4] hover:bg-[#0891B2] flex items-center justify-center text-white cursor-pointer shadow-md transition-all scale-105 hover:scale-110 active:scale-95">
                    <Camera className="w-3.5 h-3.5" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfileAvatarUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden" 
                    />
                  </label>
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div>
                    <span className="text-[10px] bg-indigo-500/20 text-[#A5B4FC] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
                      {currentUser.role === 'admin' ? 'Administrador Geral' : currentUser.role === 'leader' ? 'Líder Ministério' : 'Servo Voluntário'}
                    </span>
                  </div>
                  <h4 className="text-lg font-extrabold text-white leading-tight">{currentUser.name}</h4>
                  <p className="text-xs text-white/60 font-mono">{currentUser.email}</p>
                </div>

              </div>

              {/* Drag and Drop File Upload section */}
              <p className="text-[10px] text-[#A5B4FC] font-extrabold uppercase tracking-wider">Selecione uma foto do seu computador ou celular</p>
              
              <div className="border-2 border-dashed border-[#06B6D4]/30 hover:border-[#06B6D4]/70 rounded-[1.5rem] p-8 text-center cursor-pointer hover:bg-white/[0.03] transition-all relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setProfileAvatarUrl(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                />
                <div className="w-12 h-12 rounded-full bg-[#06B6D4]/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 duration-200 transition-transform">
                  <Upload className="w-6 h-6 text-[#06B6D4]" />
                </div>
                <p className="text-xs font-extrabold text-white">Arraste um arquivo ou clique para selecionar</p>
                <p className="text-[10px] text-[#A5B4FC]/60 mt-1">Suporta imagens JPG, PNG ou GIF. O arquivo é salvo localmente em seu perfil.</p>
              </div>

              {profileAvatarUrl && (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setProfileAvatarUrl('')}
                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    Excluir Foto Atual
                  </button>
                </div>
              )}

            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-white/10 relative z-10">
              <button
                type="button"
                onClick={() => {
                  handleUpdateProfileAvatar(profileAvatarUrl);
                  setShowProfileModal(false);
                }}
                className="flex-1 py-3 bg-[#4C3BCF] hover:bg-[#3B28B8] font-extrabold rounded-xl transition-all shadow-md text-white text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Salvar Alterações
              </button>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 font-extrabold rounded-xl transition-all text-white text-xs uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-natural-border mt-auto py-5">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-1.5 text-[11px] text-natural-text font-medium">
          <p>IG Escala &copy; 2026. </p>
        </div>
      </footer>

    </div>
  );
}
