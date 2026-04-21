-- ================= TAB 3: TELEPORT (STICKY FOLLOW ON/OFF) =================
local TpTab = Window:CreateTab("Teleport", 4483362458)

local SelectedPlayer = nil
_G.FollowEnabled = false -- Biến kiểm tra trạng thái On/Off
_G.TpSpeed = 150
_G.HeightOffset = 20

local PlayerDropdown = TpTab:CreateDropdown({
   Name = "Chọn Người Chơi",
   Options = {},
   CurrentOption = "",
   Callback = function(Option) SelectedPlayer = Option[1] end,
})

TpTab:CreateButton({
   Name = "Làm mới danh sách",
   Callback = function()
      local pList = {}
      for _, v in pairs(game.Players:GetPlayers()) do
         if v ~= game.Players.LocalPlayer then table.insert(pList, v.Name) end
      end
      PlayerDropdown:Refresh(pList)
   end,
})

TpTab:CreateSlider({
   Name = "Tốc độ Đuổi theo",
   Range = {50, 500},
   Increment = 10,
   CurrentValue = 150,
   Callback = function(v) _G.TpSpeed = v end,
})

-- CHUYỂN THÀNH TOGGLE ON/OFF
TpTab:CreateToggle({
   Name = "Bám đuổi mục tiêu (On/Off)",
   CurrentValue = false,
   Callback = function(Value)
      _G.FollowEnabled = Value
      
      if _G.FollowEnabled then
         task.spawn(function()
            local char = game.Players.LocalPlayer.Character
            local hrp = char.HumanoidRootPart
            local hum = char:FindFirstChildOfClass("Humanoid")

            Rayfield:Notify({Title = "The Ngoc Hub", Content = "Đã bật bám đuổi!", Duration = 2})

            while _G.FollowEnabled do
               local targetPlayer = game.Players:FindFirstChild(SelectedPlayer)
               
               if targetPlayer and targetPlayer.Character and targetPlayer.Character:FindFirstChild("HumanoidRootPart") then
                  local targetHrp = targetPlayer.Character.HumanoidRootPart
                  -- Vị trí đích: Luôn là trên đầu địch 20 studs
                  local targetPos = (targetHrp.CFrame * CFrame.new(0, _G.HeightOffset, 0)).Position
                  
                  local currentPos = hrp.Position
                  local dist = (targetPos - currentPos).Magnitude

                  if dist > 0.5 then
                     -- Tính toán hướng di chuyển để bám theo khi địch chạy
                     local direction = (targetPos - currentPos).Unit
                     local moveStep = direction * math.min(dist, _G.TpSpeed * game:GetService("RunService").Heartbeat:Wait())
                     
                     hrp.CFrame = CFrame.new(currentPos + moveStep, targetHrp.Position)
                  else
                     -- Nếu đã sát bên thì dán chặt vào luôn
                     hrp.CFrame = targetHrp.CFrame * CFrame.new(0, _G.HeightOffset, 0)
                  end
                  
                  -- Chống giật (Rubberband)
                  hrp.Velocity = Vector3.new(0,0,0)
                  hrp.AssemblyLinearVelocity = Vector3.new(0,0,0)
                  hum:ChangeState(Enum.HumanoidStateType.Physics)
               else
                  -- Nếu mục tiêu thoát hoặc chết
                  task.wait(0.5)
               end
               game:GetService("RunService").Heartbeat:Wait()
            end
            
            -- KHI TẮT (OFF): Trả lại trạng thái bình thường
            hum:ChangeState(Enum.HumanoidStateType.Landing)
            Rayfield:Notify({Title = "The Ngoc Hub", Content = "Đã tắt bám đuổi!", Duration = 2})
         end)
      end
   end,
})

TpTab:CreateSlider({
   Name = "Độ cao bám theo (Studs)",
   Range = {5, 100},
   Increment = 5,
   CurrentValue = 20,
   Callback = function(v) _G.HeightOffset = v end,
})
