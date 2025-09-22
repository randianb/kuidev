import { createPage, createNode } from "./types";
import { upsertPage } from "./storage";

// 初始化示例页面
export function initSamplePages() {
  // 1. 技术栈展示页面 (Landing模板)
  const techStackPage = createPage("技术栈展示", "landing");
  
  // 增强头部区域
  const headerContainer = techStackPage.root.children![0];
  headerContainer.children = [
    createNode("Container", {
      props: { 
        title: "导航栏",
        className: "w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4"
      },
      layout: "row",
      children: [
        createNode("Label", { 
          props: { 
            text: "TechStack", 
            className: "text-2xl font-bold"
          } 
        }),
        createNode("Container", {
          props: { className: "flex-1" }
        }),
        createNode("Container", {
          layout: "row",
          props: { className: "space-x-4" },
          children: [
            createNode("Button", { props: { text: "首页", variant: "ghost" } }),
            createNode("Button", { props: { text: "技术", variant: "ghost" } }),
            createNode("Button", { props: { text: "关于", variant: "ghost" } }),
            createNode("Button", { props: { text: "联系", variant: "outline" } })
          ]
        })
      ]
    })
  ];

  // 增强主体区域
  const mainContainer = techStackPage.root.children![1];
  mainContainer.children = [
    // Hero Section
    createNode("Container", {
      props: { 
        title: "Hero区域",
        className: "bg-gradient-to-br from-slate-900 to-slate-800 text-white py-20 px-6 text-center"
      },
      layout: "col",
      children: [
        createNode("Label", { 
          props: { 
            text: "现代化技术栈", 
            className: "text-5xl font-bold mb-6"
          } 
        }),
        createNode("Label", { 
          props: { 
            text: "构建下一代Web应用的完整解决方案", 
            className: "text-xl text-gray-300 mb-8"
          } 
        }),
        createNode("Container", {
          layout: "row",
          props: { className: "justify-center space-x-4" },
          children: [
            createNode("Button", { props: { text: "开始使用", variant: "default", size: "lg" } }),
            createNode("Button", { props: { text: "查看文档", variant: "outline", size: "lg" } })
          ]
        })
      ]
    }),
    
    // 技术栈展示
    createNode("Container", {
      props: { 
        title: "技术栈",
        className: "py-16 px-6"
      },
      layout: "col",
      children: [
        createNode("Label", { 
          props: { 
            text: "核心技术", 
            className: "text-3xl font-bold text-center mb-12"
          } 
        }),
        createNode("Grid", {
          props: { 
            cols: 12, 
            gap: 6, 
            responsive: true,
            className: "max-w-6xl mx-auto"
          },
          children: [
            createNode("GridItem", { 
              props: { span: 4, smSpan: 6, mdSpan: 4 },
              children: [
                createNode("Card", {
                  props: { 
                    title: "React 18",
                    className: "h-full text-center p-6 hover:shadow-lg transition-shadow"
                  },
                  children: [
                    createNode("Label", { props: { text: "⚛️", className: "text-4xl mb-4" } }),
                    createNode("Label", { props: { text: "现代化的用户界面库", className: "text-gray-600" } })
                  ]
                })
              ]
            }),
            createNode("GridItem", { 
              props: { span: 4, smSpan: 6, mdSpan: 4 },
              children: [
                createNode("Card", {
                  props: { 
                    title: "TypeScript",
                    className: "h-full text-center p-6 hover:shadow-lg transition-shadow"
                  },
                  children: [
                    createNode("Label", { props: { text: "📘", className: "text-4xl mb-4" } }),
                    createNode("Label", { props: { text: "类型安全的JavaScript", className: "text-gray-600" } })
                  ]
                })
              ]
            }),
            createNode("GridItem", { 
              props: { span: 4, smSpan: 6, mdSpan: 4 },
              children: [
                createNode("Card", {
                  props: { 
                    title: "Tailwind CSS",
                    className: "h-full text-center p-6 hover:shadow-lg transition-shadow"
                  },
                  children: [
                    createNode("Label", { props: { text: "🎨", className: "text-4xl mb-4" } }),
                    createNode("Label", { props: { text: "实用优先的CSS框架", className: "text-gray-600" } })
                  ]
                })
              ]
            }),
            createNode("GridItem", { 
              props: { span: 4, smSpan: 6, mdSpan: 4 },
              children: [
                createNode("Card", {
                  props: { 
                    title: "Vite",
                    className: "h-full text-center p-6 hover:shadow-lg transition-shadow"
                  },
                  children: [
                    createNode("Label", { props: { text: "⚡", className: "text-4xl mb-4" } }),
                    createNode("Label", { props: { text: "极速的构建工具", className: "text-gray-600" } })
                  ]
                })
              ]
            }),
            createNode("GridItem", { 
              props: { span: 4, smSpan: 6, mdSpan: 4 },
              children: [
                createNode("Card", {
                  props: { 
                    title: "Node.js",
                    className: "h-full text-center p-6 hover:shadow-lg transition-shadow"
                  },
                  children: [
                    createNode("Label", { props: { text: "🟢", className: "text-4xl mb-4" } }),
                    createNode("Label", { props: { text: "高性能的JavaScript运行时", className: "text-gray-600" } })
                  ]
                })
              ]
            }),
            createNode("GridItem", { 
              props: { span: 4, smSpan: 6, mdSpan: 4 },
              children: [
                createNode("Card", {
                  props: { 
                    title: "Prisma",
                    className: "h-full text-center p-6 hover:shadow-lg transition-shadow"
                  },
                  children: [
                    createNode("Label", { props: { text: "🔷", className: "text-4xl mb-4" } }),
                    createNode("Label", { props: { text: "现代化的数据库工具", className: "text-gray-600" } })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
  ];

  upsertPage(techStackPage);

  // 2. 产品介绍页面 (Content模板)
  const productPage = createPage("产品介绍", "content");
  
  // 增强头部
  const productHeader = productPage.root.children![0];
  productHeader.children = [
    createNode("Container", {
      props: { 
        className: "w-full bg-white shadow-sm border-b px-6 py-4"
      },
      layout: "row",
      children: [
        createNode("Label", { 
          props: { 
            text: "ProductHub", 
            className: "text-2xl font-bold text-blue-600"
          } 
        }),
        createNode("Container", { props: { className: "flex-1" } }),
        createNode("Container", {
          layout: "row",
          props: { className: "space-x-6" },
          children: [
            createNode("Link", { props: { text: "产品", href: "#products" } }),
            createNode("Link", { props: { text: "解决方案", href: "#solutions" } }),
            createNode("Link", { props: { text: "定价", href: "#pricing" } }),
            createNode("Button", { props: { text: "免费试用", size: "sm" } })
          ]
        })
      ]
    })
  ];

  // 增强内容主体
  const productMain = productPage.root.children![1];
  productMain.children = [
    createNode("Container", {
      props: { 
        title: "产品特性",
        className: "max-w-4xl mx-auto py-12 px-6"
      },
      layout: "col",
      children: [
        createNode("Label", { 
          props: { 
            text: "强大的产品功能", 
            className: "text-4xl font-bold text-center mb-4"
          } 
        }),
        createNode("Label", { 
          props: { 
            text: "为您的业务提供全方位的解决方案", 
            className: "text-xl text-gray-600 text-center mb-12"
          } 
        }),
        
        createNode("Grid", {
          props: { cols: 12, gap: 8, responsive: true },
          children: [
            createNode("GridItem", { 
              props: { span: 6, smSpan: 12 },
              children: [
                createNode("InfoCard", {
                  props: { 
                    title: "智能分析",
                    description: "基于AI的数据分析，帮助您做出更明智的决策",
                    icon: "📊",
                    className: "h-full"
                  }
                })
              ]
            }),
            createNode("GridItem", { 
              props: { span: 6, smSpan: 12 },
              children: [
                createNode("InfoCard", {
                  props: { 
                    title: "实时协作",
                    description: "团队成员可以实时协作，提高工作效率",
                    icon: "👥",
                    className: "h-full"
                  }
                })
              ]
            }),
            createNode("GridItem", { 
              props: { span: 6, smSpan: 12 },
              children: [
                createNode("InfoCard", {
                  props: { 
                    title: "安全可靠",
                    description: "企业级安全保障，数据加密存储",
                    icon: "🔒",
                    className: "h-full"
                  }
                })
              ]
            }),
            createNode("GridItem", { 
              props: { span: 6, smSpan: 12 },
              children: [
                createNode("InfoCard", {
                  props: { 
                    title: "易于集成",
                    description: "丰富的API接口，轻松集成到现有系统",
                    icon: "🔗",
                    className: "h-full"
                  }
                })
              ]
            })
          ]
        })
      ]
    })
  ];

  upsertPage(productPage);

  // 3. 仪表板页面 (Dashboard模板)
  const dashboardPage = createPage("数据仪表板", "dashboard");
  
  // 增强顶部导航
  const dashboardHeader = dashboardPage.root.children![0];
  dashboardHeader.children = [
    createNode("Container", {
      props: { 
        className: "w-full bg-slate-800 text-white px-6 py-4"
      },
      layout: "row",
      children: [
        createNode("Label", { 
          props: { 
            text: "Analytics Dashboard", 
            className: "text-xl font-semibold"
          } 
        }),
        createNode("Container", { props: { className: "flex-1" } }),
        createNode("Container", {
          layout: "row",
          props: { className: "space-x-4" },
          children: [
            createNode("Button", { props: { text: "导出", variant: "outline", size: "sm" } }),
            createNode("Button", { props: { text: "设置", variant: "ghost", size: "sm" } }),
            createNode("Avatar", { props: { fallback: "U" } })
          ]
        })
      ]
    })
  ];

  // 增强仪表板内容
  const dashboardGrid = dashboardPage.root.children![1];
  if (dashboardGrid.type === "Grid") {
    dashboardGrid.children = [
      // 统计卡片
      createNode("GridItem", { 
        props: { span: 3, smSpan: 6, mdSpan: 4 },
        children: [
          createNode("StatsCard", {
            props: { 
              title: "总用户数",
              value: "12,345",
              change: "+12%",
              trend: "up",
              icon: "👥"
            }
          })
        ]
      }),
      createNode("GridItem", { 
        props: { span: 3, smSpan: 6, mdSpan: 4 },
        children: [
          createNode("StatsCard", {
            props: { 
              title: "月收入",
              value: "¥89,432",
              change: "+8%",
              trend: "up",
              icon: "💰"
            }
          })
        ]
      }),
      createNode("GridItem", { 
        props: { span: 3, smSpan: 6, mdSpan: 4 },
        children: [
          createNode("StatsCard", {
            props: { 
              title: "转化率",
              value: "3.24%",
              change: "-2%",
              trend: "down",
              icon: "📈"
            }
          })
        ]
      }),
      createNode("GridItem", { 
        props: { span: 3, smSpan: 6, mdSpan: 4 },
        children: [
          createNode("StatsCard", {
            props: { 
              title: "活跃用户",
              value: "8,921",
              change: "+15%",
              trend: "up",
              icon: "⚡"
            }
          })
        ]
      }),
      
      // 图表区域
      createNode("GridItem", { 
        props: { span: 8, smSpan: 12, mdSpan: 8 },
        children: [
          createNode("Card", {
            props: { 
              title: "收入趋势",
              className: "h-full"
            },
            children: [
              createNode("Container", {
                props: { 
                  className: "h-64 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center"
                },
                children: [
                  createNode("Label", { 
                    props: { 
                      text: "📊 图表区域 (可集成Chart.js等图表库)", 
                      className: "text-gray-600"
                    } 
                  })
                ]
              })
            ]
          })
        ]
      }),
      
      // 侧边信息
      createNode("GridItem", { 
        props: { span: 4, smSpan: 12, mdSpan: 4 },
        children: [
          createNode("Card", {
            props: { 
              title: "最新活动",
              className: "h-full"
            },
            children: [
              createNode("Container", {
                layout: "col",
                props: { className: "space-y-4" },
                children: [
                  createNode("Container", {
                    layout: "row",
                    props: { className: "items-center space-x-3" },
                    children: [
                      createNode("Avatar", { props: { fallback: "A", size: "sm" } }),
                      createNode("Container", {
                        layout: "col",
                        children: [
                          createNode("Label", { props: { text: "新用户注册", className: "font-medium" } }),
                          createNode("Label", { props: { text: "2分钟前", className: "text-sm text-gray-500" } })
                        ]
                      })
                    ]
                  }),
                  createNode("Container", {
                    layout: "row",
                    props: { className: "items-center space-x-3" },
                    children: [
                      createNode("Avatar", { props: { fallback: "B", size: "sm" } }),
                      createNode("Container", {
                        layout: "col",
                        children: [
                          createNode("Label", { props: { text: "订单完成", className: "font-medium" } }),
                          createNode("Label", { props: { text: "5分钟前", className: "text-sm text-gray-500" } })
                        ]
                      })
                    ]
                  }),
                  createNode("Container", {
                    layout: "row",
                    props: { className: "items-center space-x-3" },
                    children: [
                      createNode("Avatar", { props: { fallback: "C", size: "sm" } }),
                      createNode("Container", {
                        layout: "col",
                        children: [
                          createNode("Label", { props: { text: "系统更新", className: "font-medium" } }),
                          createNode("Label", { props: { text: "10分钟前", className: "text-sm text-gray-500" } })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    ];
  }

  upsertPage(dashboardPage);

  // 4. 管理后台页面 (Admin模板)
  const adminPage = createPage("管理后台", "admin");
  
  // 增强顶部导航
  const adminHeader = adminPage.root.children![0];
  adminHeader.children = [
    createNode("Container", {
      props: { 
        className: "w-full bg-gray-900 text-white px-6 py-4"
      },
      layout: "row",
      children: [
        createNode("Label", { 
          props: { 
            text: "Admin Panel", 
            className: "text-xl font-bold"
          } 
        }),
        createNode("Container", { props: { className: "flex-1" } }),
        createNode("Container", {
          layout: "row",
          props: { className: "space-x-4" },
          children: [
            createNode("Button", { props: { text: "通知", variant: "ghost", size: "sm" } }),
            createNode("Button", { props: { text: "帮助", variant: "ghost", size: "sm" } }),
            createNode("Avatar", { props: { fallback: "A" } })
          ]
        })
      ]
    })
  ];

  // 增强主体区域
  const adminMain = adminPage.root.children![1];
  if (adminMain.layout === "row") {
    // 侧边栏
    const sidebar = adminMain.children![0];
    sidebar.props = { 
      title: "导航菜单",
      className: "w-64 bg-gray-800 text-white"
    };
    sidebar.children = [
      createNode("Container", {
        layout: "col",
        props: { className: "p-4 space-y-2" },
        children: [
          createNode("Button", { 
            props: { 
              text: "📊 仪表板", 
              variant: "ghost", 
              className: "w-full justify-start text-white hover:bg-gray-700"
            } 
          }),
          createNode("Button", { 
            props: { 
              text: "👥 用户管理", 
              variant: "ghost", 
              className: "w-full justify-start text-white hover:bg-gray-700"
            } 
          }),
          createNode("Button", { 
            props: { 
              text: "📦 产品管理", 
              variant: "ghost", 
              className: "w-full justify-start text-white hover:bg-gray-700"
            } 
          }),
          createNode("Button", { 
            props: { 
              text: "📋 订单管理", 
              variant: "ghost", 
              className: "w-full justify-start text-white hover:bg-gray-700"
            } 
          }),
          createNode("Button", { 
            props: { 
              text: "⚙️ 系统设置", 
              variant: "ghost", 
              className: "w-full justify-start text-white hover:bg-gray-700"
            } 
          })
        ]
      })
    ];

    // 工作区
    const workspace = adminMain.children![1];
    workspace.props = { 
      title: "内容区域",
      className: "flex-1 bg-gray-50"
    };
    workspace.children = [
      createNode("Container", {
        props: { className: "p-6" },
        layout: "col",
        children: [
          createNode("Container", {
            layout: "row",
            props: { className: "items-center justify-between mb-6" },
            children: [
              createNode("Label", { 
                props: { 
                  text: "用户管理", 
                  className: "text-2xl font-bold"
                } 
              }),
              createNode("Button", { 
                props: { 
                  text: "添加用户", 
                  className: "bg-blue-600 hover:bg-blue-700"
                } 
              })
            ]
          }),
          
          createNode("Card", {
            props: { 
              title: "用户列表",
              className: "w-full"
            },
            children: [
              createNode("Table", {
                props: {
                  headers: ["ID", "用户名", "邮箱", "角色", "状态", "操作"],
                  data: [
                    ["1", "张三", "zhangsan@example.com", "管理员", "活跃", "编辑 | 删除"],
                    ["2", "李四", "lisi@example.com", "用户", "活跃", "编辑 | 删除"],
                    ["3", "王五", "wangwu@example.com", "用户", "禁用", "编辑 | 删除"]
                  ],
                  className: "w-full"
                }
              })
            ]
          })
        ]
      })
    ];
  }

  upsertPage(adminPage);

  console.log("✅ 已成功创建4个示例页面:");
  console.log("1. 技术栈展示 (Landing模板)");
  console.log("2. 产品介绍 (Content模板)");
  console.log("3. 数据仪表板 (Dashboard模板)");
  console.log("4. 管理后台 (Admin模板)");
}

// 如果直接运行此文件，则执行初始化
if (typeof window !== "undefined") {
  initSamplePages();
}