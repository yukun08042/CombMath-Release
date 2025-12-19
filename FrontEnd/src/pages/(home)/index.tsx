//登陆成功后，默认显示欢迎界面
import React, { useEffect } from "react";
import { Title } from '@mantine/core';
import { useHeader } from "@/context/HeaderContext";
import { checkLogin, newChat, newMsg } from "@/lib/api";
import { showLoading, updateError, updateSuccess } from "@/components/NotificationHandler";
import { useNavigate } from "react-router-dom";


const Index: React.FC = () => {
    const navigate = useNavigate();
    console.log("welcome");
    document.title = "组合数学 | 主页";
    // 设置页眉标题，必须用useEffect，否则卡死
    const { setHeaderContent, setChatId } = useHeader();
    useEffect(() => {
        setHeaderContent(<>主页</>);
    }, [setHeaderContent]);

    useEffect(() => {
        checkLogin().then((res) => {
            if (res.data.code === 0) {
                console.log("已登录");
            }
        }).catch((err) => {
            console.log(err);
            console.log("未登录");
        });
      }, []);

      const execNewChat = () => {
        const id = showLoading("正在创建新的Chat...");
        newChat().then(res => {
            if (res.data.code === 0) {
                const newId = res.data.chat_id;
                setChatId(newId);
                updateSuccess(id, "Chat创建成功", `新的ChatID: ${newId}`);
                // 创建成功后跳转到新的Chat页面
                navigate(`/${newId}`);
            } else {
                updateError(id, "Chat创建失败", res.data.message || "未知错误");
            }
        }).catch(err => {
            console.error(err);
            updateError(id, "Chat创建失败", err.message || "网络或服务器错误");
        });
    }

    return (
        <div style={{ padding: "0 24px", textAlign: "center", margin: "0 auto", marginTop: "35vh" }}>
            <Title order={2}>组合数学</Title>
            <p>请从左边栏进入相应功能页</p>
            {/* <button onClick={execNewChat}>新建Chat</button> */}
        </div>
    );
};

export default Index;
