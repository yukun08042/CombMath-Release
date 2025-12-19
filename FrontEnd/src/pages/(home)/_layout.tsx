import { useState, useEffect } from 'react';
import { Outlet, redirect, useLoaderData, useNavigate } from "react-router-dom";
import { LoaderData, NavItem } from "@/lib/definitions";
import { AppShell, Badge, Burger, Code, Group, ScrollArea, Text, Button, Center, Stack, useMantineTheme, Modal, Fieldset, TextInput, Textarea, Switch, TagsInput } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconHome, IconBrandHipchat, IconLogout, IconList } from '@tabler/icons-react';
import { Navbar } from '@/components/NavBar/NavBar';
import { HeaderWrapper } from '@/context/HeaderContext';
import { checkLogin, logout } from '@/lib/api';
import { socketManager } from '@/lib/socket';

const data: NavItem[] = [
	{ link: '/', label: '主页', icon: IconHome },
	{ link: '/list', label: '习题集', icon: IconList },
	// { link: '/test', label: '测试页面', icon: IconList },
];

export async function Loader() {
	try {
		const res = await checkLogin();
		if (res.data.code === 0) {
			socketManager.connect();
			return res.data.username;
		} else {
			socketManager.disconnect();
			return redirect('/login');
		}
	} catch (err) {
		console.error(err);
		socketManager.disconnect();
		return redirect('/login');
	}
}

export default function BaseLayout() {
	const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
	const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
	const [navbarWidth, setNavbarWidth] = useState<number>(250);

	const username = useLoaderData() as LoaderData<typeof Loader>;
	const navigate = useNavigate();

	const theme = useMantineTheme();
	// 检测是否为移动设备
	const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);


	const [isConnected, setIsConnected] = useState<boolean>(socketManager.connected);
	useEffect(() => {
		function onConnect() {
			setIsConnected(true);
		}

		function onDisconnect() {
			setIsConnected(false);
		}

		socketManager.onConnect(onConnect);
		socketManager.onDisconnect(onDisconnect);

		return () => {
			socketManager.offDisconnect(onDisconnect);
			socketManager.offConnect(onConnect);
		};
	}, []);


	return (
		<AppShell
			header={{ height: 45 }}
			navbar={{
				width: navbarWidth,
				breakpoint: 'sm',
				collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
			}}
			padding="md"
			styles={{
				main: {
					height: '100dvh',
				},
			}}
		>
			<AppShell.Header>
				<Group h="100%" px="md" justify="space-between">
					<Group>
						<Burger onClick={toggleMobile} hiddenFrom="sm" size="sm" />
						<Burger onClick={toggleDesktop} visibleFrom="sm" size="sm" />
						<HeaderWrapper />
						<Text size='md' c={'gray'} visibleFrom="sm">用户名</Text>
						<Code fw={700}>{username}</Code>
						<Badge size='lg' color={isConnected ? 'blue' : 'red'} >
							{isConnected ? '已连接' : '未连接'}
						</Badge>
					</Group>
				</Group>
			</AppShell.Header>
			<AppShell.Navbar>
				<Stack gap={0} p='md' h='100%'>
					<AppShell.Section>
						<Group py="md">
							<Stack justify="space-between" >
								<Group ml="xl">
									<Text size='md' c={'gray'}>用户名</Text>
									<Code fw={700}>{username}</Code>
								</Group>
							</Stack>
						</Group>
					</AppShell.Section>

					<AppShell.Section grow my="md" component={ScrollArea} type='scroll'>
						<Navbar data={data} clickHandler={closeMobile} />
					</AppShell.Section>

					<AppShell.Section>
						<Center>
							<Button
								variant="subtle" color='gray'
								fullWidth
								leftSection={<IconLogout />}
								onClick={() => {
									logout().then((res) => {
										if (res.data.code === 0) {
											navigate('/login');
										}
									}).catch((err) => {
										console.error(err);
										navigate('/login');
									});
								}}
							>Logout</Button>
						</Center>
					</AppShell.Section>
					
				</Stack>
			</AppShell.Navbar>

			<AppShell.Main>
				<Outlet />
			</AppShell.Main>
		</AppShell>
	);
}
