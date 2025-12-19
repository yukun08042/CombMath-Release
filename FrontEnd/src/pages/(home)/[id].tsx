import { useHeader } from '@/context/HeaderContext';
import { newMsg, refresh } from '@/lib/api';
import { MessageResponse, PrivacyAnalysisResponse } from '@/lib/definitions';
import { socketManager } from '@/lib/socket';
import { Container, Text, Group, Card, Grid, Box, ScrollArea, Textarea, Button, Avatar, Stack } from '@mantine/core';
import { Icon123 } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';  // 引入Markdown渲染

// Chat Component
const Chat = () => {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [privacyAnalyses, setPrivacyAnalyses] = useState<PrivacyAnalysisResponse[]>([]);
  const [input, setInput] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null); // 当前高亮的message id
  const [highlightedAnalysisId, setHighlightedAnalysisId] = useState<number | null>(null); // 当前高亮的analysis id
  const { chat_id, setChatId } = useHeader();

  // Send Message Function
  const sendMessage = () => {
    if (!input.trim()) return;
    newMsg(chat_id, input).then(res => {
      if (res.data.code === 0) {
        setInput('');
      } else {
        console.error('消息发送失败:', res.data.message);
      }
    }).catch(err => {
      console.error('消息发送错误:', err);
    });
  };

  // Handle Enter Key to Send Message
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // Handle Socket Updates
  const handleAllMessages = (data: MessageResponse[]) => {
    if (data.length === 0) return;
    console.log("Received all messages:", data);
    setMessages(data);
  };

  const handleAllPrivacyAnalyses = (data: PrivacyAnalysisResponse[]) => {
    if (data.length === 0) return;
    console.log("Received all privacy analyses:", data);
    setPrivacyAnalyses(data);
  };

  useEffect(() => {
    socketManager.onAllMessages(handleAllMessages);
    socketManager.onAllPrivacyAnalyses(handleAllPrivacyAnalyses);

    return () => {
      socketManager.offAllMessages(handleAllMessages);
      socketManager.offAllPrivacyAnalyses(handleAllPrivacyAnalyses);
    };
  }, [handleAllMessages, handleAllPrivacyAnalyses]);

  useEffect(() => {
    const chatIdFromPath = Number(window.location.pathname.split("/")[1]);
    refresh(chatIdFromPath).then(res => {
      if (res.data.code === 0) {
        setMessages(res.data.messages);
        setPrivacyAnalyses(res.data.suggestions);
      } else {
        console.error('刷新聊天记录失败:', res.data.message);
      }
    }).catch(err => {
      console.error('刷新聊天记录错误:', err);
    });
    setChatId(chatIdFromPath);
  }, []);

  // Group privacy analyses by message_id
  const groupedPrivacyAnalyses = privacyAnalyses.reduce((acc, analysis) => {
    const { message_id } = analysis;
    if (!acc[message_id]) {
      acc[message_id] = [];
    }
    acc[message_id].push(analysis);
    return acc;
  }, {} as Record<number, PrivacyAnalysisResponse[]>);

  // Handle hover on left (message) card
  const handleMessageHover = (messageId: number) => {
    setHighlightedMessageId(messageId);
    setHighlightedAnalysisId(null); // Clear highlighted analysis
  };

  // Handle hover on right (analysis) card
  const handleAnalysisHover = (analysisId: number, messageId: number) => {
    setHighlightedAnalysisId(analysisId);
    setHighlightedMessageId(messageId); // Jump to the corresponding message
  };

  return (
    <Container style={{ paddingBottom: '20px', marginTop: '20px', backgroundColor: '#F7F7F7' }}>
      {/* Grid layout: Left side - Chat, Right side - Privacy Analysis */}
      <Grid gutter="lg">
        {/* Left Side: Chat Messages */}
        <Grid.Col span={8}>
          <ScrollArea style={{ height: '70vh' }}>
            {messages.length > 0 && messages.map((message, index) => (
              <Card
                key={index}
                style={{
                  marginBottom: '15px',
                  backgroundColor: '#fff',
                  borderRadius: '10px',
                  padding: '15px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'row',
                  border: highlightedMessageId === message.message_id ? '2px solid #FFD54F' : 'none', // Highlight border (soft yellow)
                  animation: highlightedMessageId === message.message_id ? 'highlightFlash 0.5s forwards' : 'none', // Flash only once
                }}
                onMouseEnter={() => handleMessageHover(message.message_id)}
              >
                <Avatar radius="xl">
                  {message.message_type === 'user' ? 'U' : 'A'}
                </Avatar>
                <Box style={{ display: 'flex', flexDirection: 'column', maxWidth: '100%' }}>
                  <Text size="sm" color="gray" style={{ marginLeft: '10px' }}>{message.message_type === 'user' ? 'User' : 'Agent'}</Text>
                  {/* 使用ReactMarkdown渲染Markdown */}
                  <Box style={{ marginLeft: '10px' }}>
                    <ReactMarkdown children={message.content} />
                  </Box>
                </Box>
              </Card>
            ))}
          </ScrollArea>
        </Grid.Col>

        {/* Right Side: Privacy Analysis */}
        <Grid.Col span={4}>
          <Text style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
            隐私分析
          </Text>
          <ScrollArea style={{ height: '70vh' }}>
            {Object.entries(groupedPrivacyAnalyses).map(([messageId, analyses]) => (
              <Card
                key={messageId}
                style={{
                  marginBottom: '15px',
                  backgroundColor: '#fff',
                  borderRadius: '10px',
                  padding: '15px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  border: highlightedAnalysisId !== null && highlightedMessageId === Number(messageId) ? '2px solid #FFD54F' : 'none', // Highlight border (soft yellow)
                  animation: highlightedAnalysisId === analyses[0].message_id ? 'highlightFlash 0.5s forwards' : 'none', // Flash only once
                }}
                onMouseEnter={() => handleAnalysisHover(analyses[0].message_id, Number(messageId))}
              >
                {analyses.map((analysis, index) => (
                  <Box key={index} style={{ marginBottom: '10px' }}>
                    <Text style={{ fontSize: '14px', color: 'gray' }}><strong>原始文本:</strong> {analysis.original_text}</Text>
                    <Text style={{ fontSize: '14px' }}><strong>隐私分析:</strong> {analysis.privacy_analysis}</Text>
                    <Text style={{ fontSize: '14px' }}><strong>占位符:</strong> {analysis.placeholder}</Text>
                  </Box>
                ))}
              </Card>
            ))}
          </ScrollArea>
        </Grid.Col>
      </Grid>

      {/* Message Input */}
      <Group style={{ marginTop: '0px' }}>
        <Textarea
          placeholder="在此输入消息..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            borderRadius: '20px',
            padding: '10px',
            borderColor: '#ccc',
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        />
        <Button
          onClick={sendMessage}
          style={{
            marginLeft: '10px',
            backgroundColor: '#25D366',
            borderRadius: '20px',
            padding: '10px 20px',
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          发送
        </Button>
      </Group>

      <style>
        {`
          @keyframes highlightFlash {
            0% { background-color: #FFF9C4; }  /* Soft yellow */
            100% { background-color: transparent; }
          }
        `}
      </style>
    </Container>
  );
};

export default Chat;
