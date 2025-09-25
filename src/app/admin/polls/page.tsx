
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Trash2, Loader2, BarChart3, Users, CheckSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Progress } from '@/components/ui/progress';

interface Poll {
    id: string;
    question: string;
    options: string[];
    isActive: boolean;
    createdAt: Timestamp;
    votes: { [key: string]: string[] }; // option -> [userId]
}

export default function AdminPollsPage() {
    const [polls, setPolls] = useState<Poll[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);

    const [user] = useAuthState(auth);
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, snapshot => {
            const pollData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Poll));
            setPolls(pollData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const addOption = () => setOptions([...options, '']);
    const removeOption = (index: number) => setOptions(options.filter((_, i) => i !== index));

    const handleSubmitPoll = async () => {
        if (!question.trim() || options.some(opt => !opt.trim())) {
            toast({ title: '입력 오류', description: '질문과 모든 옵션을 입력해주세요.', variant: 'destructive' });
            return;
        }
        if (!user) return;
        setIsProcessing(true);
        try {
            await addDoc(collection(db, 'polls'), {
                question,
                options,
                isActive: true,
                createdAt: Timestamp.now(),
                createdBy: user.uid,
                votes: {}
            });
            toast({ title: '성공', description: '새로운 설문조사가 생성되었습니다.' });
            setIsDialogOpen(false);
            setQuestion('');
            setOptions(['', '']);
        } catch (error: any) {
            toast({ title: '오류', description: error.message, variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    const togglePollStatus = async (poll: Poll) => {
        const pollRef = doc(db, 'polls', poll.id);
        await updateDoc(pollRef, { isActive: !poll.isActive });
        toast({ title: '성공', description: `설문이 ${!poll.isActive ? '활성화' : '비활성화'}되었습니다.` });
    };
    
    const deletePoll = async (pollId: string) => {
        if(!window.confirm('정말로 이 설문조사를 삭제하시겠습니까? 모든 투표 결과가 사라집니다.')) return;
        await deleteDoc(doc(db, 'polls', pollId));
        toast({title: '삭제 완료', description: '설문조사가 삭제되었습니다.'});
    }
    
    const getTotalVotes = (poll: Poll) => {
        if (!poll.votes) return 0;
        return Object.values(poll.votes).reduce((sum, users) => sum + users.length, 0);
    }
    
    const getVotePercentage = (poll: Poll, option: string) => {
        const totalVotes = getTotalVotes(poll);
        if (totalVotes === 0) return 0;
        const optionVotes = poll.votes[option]?.length || 0;
        return (optionVotes / totalVotes) * 100;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
                        <BarChart3 className="mr-2 h-6 w-6" />
                        설문조사 관리
                    </h1>
                    <p className="text-muted-foreground">
                        학생들을 대상으로 설문/투표를 생성하고 결과를 확인합니다.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="mr-2"/>새 설문조사</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>새 설문조사 만들기</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="question">질문</Label>
                                <Input id="question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="학생들에게 물어볼 질문" />
                            </div>
                            <div className="space-y-2">
                                <Label>선택지</Label>
                                {options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <Input value={opt} onChange={e => handleOptionChange(i, e.target.value)} placeholder={`선택지 ${i+1}`} />
                                        {options.length > 2 && <Button variant="ghost" size="icon" onClick={() => removeOption(i)}><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={addOption}>선택지 추가</Button>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="ghost" disabled={isProcessing}>취소</Button></DialogClose>
                            <Button onClick={handleSubmitPoll} disabled={isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} 생성하기
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-6">
                {isLoading ? <p>로딩중...</p> : polls.length === 0 ? <p className="text-center text-muted-foreground py-10">생성된 설문조사가 없습니다.</p> :
                 polls.map(poll => (
                     <Card key={poll.id}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{poll.question}</CardTitle>
                                    <CardDescription>{poll.createdAt.toDate().toLocaleDateString()} 생성</CardDescription>
                                </div>
                                <div className="flex items-center gap-4">
                                     <div className="flex items-center space-x-2">
                                        <Switch
                                            id={`active-switch-${poll.id}`}
                                            checked={poll.isActive}
                                            onCheckedChange={() => togglePollStatus(poll)}
                                        />
                                        <Label htmlFor={`active-switch-${poll.id}`}>{poll.isActive ? '진행중' : '종료됨'}</Label>
                                    </div>
                                    <Button size="icon" variant="ghost" onClick={() => deletePoll(poll.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>총 {getTotalVotes(poll)}명 참여</span>
                            </div>
                            <div className="space-y-3">
                                {poll.options.map(option => (
                                    <div key={option}>
                                        <div className="flex justify-between items-center mb-1 text-sm">
                                            <span className="font-medium">{option}</span>
                                            <span className="text-muted-foreground">{getVotePercentage(poll, option).toFixed(1)}% ({poll.votes[option]?.length || 0}명)</span>
                                        </div>
                                        <Progress value={getVotePercentage(poll, option)} />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                     </Card>
                 ))
                }
            </div>
        </div>
    );
}
