'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, auth, voteOnPoll } from '@/lib/firebase';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Progress } from '@/components/ui/progress';

interface Poll {
    id: string;
    question: string;
    options: string[];
    isActive: boolean;
    createdAt: Timestamp;
    votes: { [key: string]: string[] }; // option -> [userId]
    votedBy?: string[]; // list of userIds who voted
}

export default function StudentPollsPage() {
    const [polls, setPolls] = useState<Poll[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isVoting, setIsVoting] = useState<string | null>(null);
    const [selectedOptions, setSelectedOptions] = useState<{ [pollId: string]: string }>({});
    
    const [user] = useAuthState(auth);
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, 'polls'), where('isActive', '==', true));
        const unsubscribe = onSnapshot(q, snapshot => {
            const pollData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                votedBy: Object.values(doc.data().votes || {}).flat()
            } as Poll));
            setPolls(pollData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching polls:", error);
            toast({ title: '오류', description: '설문조사 목록을 불러오는 데 실패했습니다.', variant: 'destructive' });
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [toast]);

    const handleVote = async (pollId: string) => {
        const selectedOption = selectedOptions[pollId];
        if (!user) {
            toast({ title: '로그인 필요', description: '투표하려면 로그인이 필요합니다.', variant: 'destructive' });
            return;
        }
        if (!selectedOption) {
            toast({ title: '선택 필요', description: '투표할 항목을 선택해주세요.', variant: 'destructive' });
            return;
        }

        setIsVoting(pollId);
        try {
            await voteOnPoll(user.uid, pollId, selectedOption);
            toast({ title: '투표 완료', description: '소중한 의견 감사합니다!' });
        } catch (error: any) {
            toast({ title: '오류', description: error.message, variant: 'destructive' });
        } finally {
            setIsVoting(null);
        }
    };
    
    const getTotalVotes = (poll: Poll) => {
        if (!poll.votes) return 0;
        return Object.values(poll.votes).reduce((sum, users) => sum + (users?.length || 0), 0);
    }
    
    const getVotePercentage = (poll: Poll, option: string) => {
        const totalVotes = getTotalVotes(poll);
        if (totalVotes === 0) return 0;
        const optionVotes = poll.votes[option]?.length || 0;
        return (optionVotes / totalVotes) * 100;
    }

    const hasVoted = (poll: Poll) => user && poll.votedBy?.includes(user.uid);

    return (
        <div>
            <div className="space-y-1 mb-6">
                <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
                    <CheckSquare className="mr-2 h-6 w-6" />
                    설문 및 투표
                </h1>
                <p className="text-muted-foreground">
                    학교 생활에 대한 여러분의 소중한 의견을 들려주세요.
                </p>
            </div>
            <div className="space-y-6">
                {isLoading ? <p>설문조사 목록을 불러오는 중...</p> : polls.length === 0 ? <p className="text-center text-muted-foreground py-10">현재 진행중인 설문이나 투표가 없습니다.</p> :
                 polls.map(poll => (
                     <Card key={poll.id}>
                        <CardHeader>
                            <CardTitle>{poll.question}</CardTitle>
                            <CardDescription>{poll.createdAt.toDate().toLocaleDateString()} 시작</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {hasVoted(poll) ? (
                                <div className="space-y-4">
                                     <p className="text-sm font-semibold text-primary">투표해주셔서 감사합니다! (총 {getTotalVotes(poll)}명 참여)</p>
                                     <div className="space-y-3">
                                        {poll.options.map(option => (
                                            <div key={option}>
                                                <div className="flex justify-between items-center mb-1 text-sm">
                                                    <span className="font-medium">{option} {poll.votes[option]?.includes(user!.uid) ? '(나의 선택)' : ''}</span>
                                                    <span className="text-muted-foreground">{getVotePercentage(poll, option).toFixed(1)}% ({poll.votes[option]?.length || 0}명)</span>
                                                </div>
                                                <Progress value={getVotePercentage(poll, option)} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <RadioGroup
                                    value={selectedOptions[poll.id]}
                                    onValueChange={(value) => setSelectedOptions(prev => ({...prev, [poll.id]: value}))}
                                >
                                    {poll.options.map(option => (
                                        <div key={option} className="flex items-center space-x-2">
                                            <RadioGroupItem value={option} id={`${poll.id}-${option}`} />
                                            <Label htmlFor={`${poll.id}-${option}`}>{option}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            )}
                        </CardContent>
                        {!hasVoted(poll) && (
                            <CardFooter>
                                <Button
                                    onClick={() => handleVote(poll.id)}
                                    disabled={isVoting === poll.id}
                                    className="ml-auto"
                                >
                                    {isVoting === poll.id && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    투표하기
                                </Button>
                            </CardFooter>
                        )}
                     </Card>
                 ))
                }
            </div>
        </div>
    );
}
