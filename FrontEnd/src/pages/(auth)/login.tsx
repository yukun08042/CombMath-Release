import {
    TextInput,
    PasswordInput,
    Anchor,
    Paper,
    Title,
    Text,
    Container,
    Group,
    Button,
  } from '@mantine/core';
  import { useForm } from '@mantine/form';
  import { checkLogin, login, register } from "@/lib/api";
  import { useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { useToggle } from '@mantine/hooks';
  import { showLoading, updateError, updateSuccess } from '@/components/NotificationHandler';
  
  export default function Login() {
    const navigate = useNavigate();
    const [type, toggle] = useToggle(['login', 'register']);
  
    const form = useForm({
      initialValues: {
        username: '',
        password: '',
      },
  
      validate: {
        username: (val) => (val.trim().length >= 2 ? null : '用户名至少包含2个字符'),
        password: (val) => (val.length >= 4 ? null : '密码至少包含4个字符'),
      },
    });
  
    document.title = "登录 KnowRoute";
    useEffect(() => {
      checkLogin().then((res) => {
          if (res.data.code === 0) {
              navigate('/');
          }
      }).catch((err) => {
          console.log(err);
      });
    }, []);
  
    const onSubmit = (values: typeof form.values) => {
      const id = showLoading('正在登录');
      login(values.username, values.password).then((res) => {
        if (res.data.code === 0) {
          updateSuccess(id, '登录成功');
          navigate('/');
        } else {
          console.log(res.data);
          updateError(id, '登录失败', '检查用户名和密码');
        }
      }).catch((err) => {
        console.log(err);
        updateError(id, '登录失败', '网络错误');
      });
    };
  
    const onRegister = (values: typeof form.values) => {
      const id = showLoading('正在注册');
      register(values.username, values.password).then((res) => {
          if (res.data.code === 0) {
            updateSuccess(id, '注册成功');
            // navigate('/');
            toggle(); // 切换到登录
          } else {
            console.log(res.data);
              if (res.data.code === 1) {
                updateError(id, '注册失败', '用户名已存在');
              } else {
                updateError(id, '注册失败', '密码不符合要求');
              }
          }
      }).catch((err) => {
        console.log(err);
        updateError(id, '注册失败', '网络错误');
      });
    }
  
    return (
      <>
        <Container my={'14vh'} maw={450}>
          <Title ta="center" >
            {type === 'register' ? '新用户注册' : '登录'}
          </Title>
          <Text c="dimmed" size="md" ta="center" mt={5}>
            KnowRoute
            {/* <Anchor size="sm" component="button">
            Create account
          </Anchor> */}
          </Text>
  
          <Paper withBorder shadow="md" p={30} mt={30} radius="md">
  
          <form onSubmit={
            type === 'register' ? form.onSubmit(onRegister) : form.onSubmit(onSubmit)
          }>
  
            <TextInput 
              label="用户名" placeholder="用户名"
              key={form.key('username')}
              {...form.getInputProps('username')}
            />
            <PasswordInput 
              label="密码" placeholder="密码" mt="md" 
              key={form.key('password')}
              {...form.getInputProps('password')}
            />
            <Group justify="space-between" mt="lg">
              <Anchor component="button" type="button" size="sm" onClick={() => toggle()}>
                {type === 'register'
                  ? '已有账号，点此登录'
                  : "注册新用户"}
              </Anchor>
            </Group>
            <Button fullWidth mt="xl" type="submit"
              color={type === 'register' ? 'teal' : 'blue'}
            >
              {type === 'register' ? '注册' : '登录'}
            </Button>
          </form>
          </Paper>
        </Container>
      </>
    );
  }
  