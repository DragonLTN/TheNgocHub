local Rayfield = loadstring(game:HttpGet('https://sirius.menu/rayfield'))()

local Window = Rayfield:CreateWindow({
   Name = "VAGRANT SURVIVAL: The Ngoc Hub",
   LoadingTitle = "Thx For Using",
   LoadingSubtitle = "Welcome to TheNgocHub by DragonLTN",
   ConfigurationSaving = { Enabled = false }
})

-- ================= TAB 1: VISUALS (PLAYER & NPC) =================
local EspTab = Window:CreateTab("Visuals", 4483362458)

_G.MasterESP = false
_G.NpcESP = false

EspTab:CreateToggle({
   Name = "ESP Player",
   CurrentValue = false,
   Callback = function(Value)
      _G.MasterESP = Value
      task.spawn(function()
         while _G.MasterESP do
            for _, player in pairs(game.Players:GetPlayers()) do
               if player ~= game.Players.LocalPlayer and player.Character and player.Character:FindFirstChild("HumanoidRootPart") then
                  local char = player.Character
                  local root = char.HumanoidRootPart
                  local hum = char:FindFirstChildOfClass("Humanoid")
                  
                  if root and hum then
                     -- QUÉT VŨ KHÍ CHÍNH XÁC (FIX HOLDING)
                     local holding = "None"
                     for _, v in pairs(char:GetChildren()) do
                        if v:IsA("Tool") then 
                           holding = v.Name 
                           break
                        elseif v:IsA("Model") and not v:IsA("Accessory") and v.Name ~= "HumanoidRootPart" then
                           if v:FindFirstChild("Handle") or v:FindFirstChild("Muzzle") or v:FindFirstChild("Part") then
                              holding = v.Name 
                              break
                           end
                        end
                     end

                     local billboard = root:FindFirstChild("PlayerTracker") or Instance.new("BillboardGui", root)
                     billboard.Name = "PlayerTracker"
                     billboard.AlwaysOnTop = true
                     billboard.Size = UDim2.new(0, 200, 0, 100)
                     billboard.ExtentsOffset = Vector3.new(0, 3.5, 0)
                     
                     local label = billboard:FindFirstChild("L") or Instance.new("TextLabel", billboard)
                     label.Name = "L"
                     label.BackgroundTransparency = 1
                     label.Size = UDim2.new(1, 0, 1, 0)
                     label.Font = Enum.Font.SourceSansBold
                     label.TextSize = 14
                     label.TextColor3 = Color3.new(1, 1, 1)
                     label.TextStrokeTransparency = 0
                     
                     local dist = math.floor((game.Players.LocalPlayer.Character.HumanoidRootPart.Position - root.Position).Magnitude)
                     label.Text = string.format("%s\nHP: %d\nItem: %s\n[%d m]", player.Name, math.floor(hum.Health), holding, dist)
                  end
               end
            end
            game:GetService("RunService").RenderStepped:Wait()
         end
         -- Dọn dẹp
         for _, p in pairs(game.Players:GetPlayers()) do
            if p.Character and p.Character:FindFirstChild("HumanoidRootPart") and p.Character.HumanoidRootPart:FindFirstChild("PlayerTracker") then
               p.Character.HumanoidRootPart.PlayerTracker:Destroy()
            end
         end
      end)
   end,
})

EspTab:CreateToggle({
   Name = "ESP NPC",
   CurrentValue = false,
   Callback = function(Value)
      _G.NpcESP = Value
      task.spawn(function()
         while _G.NpcESP do
            for _, obj in pairs(workspace:GetChildren()) do
               if obj:IsA("Model") and obj:FindFirstChildOfClass("Humanoid") and not game.Players:GetPlayerFromCharacter(obj) then
                  local root = obj:FindFirstChild("HumanoidRootPart") or obj:FindFirstChild("Head")
                  local hum = obj:FindFirstChildOfClass("Humanoid")
                  
                  if root and hum and hum.Health > 0 then
                     local billboard = root:FindFirstChild("NpcTracker") or Instance.new("BillboardGui", root)
                     billboard.Name = "NpcTracker"
                     billboard.AlwaysOnTop = true
                     billboard.Size = UDim2.new(0, 150, 0, 50)
                     billboard.ExtentsOffset = Vector3.new(0, 3, 0)
                     
                     local label = billboard:FindFirstChild("L") or Instance.new("TextLabel", billboard)
                     label.Name = "L"
                     label.BackgroundTransparency = 1
                     label.Size = UDim2.new(1, 0, 1, 0)
                     label.Font = Enum.Font.SourceSans
                     label.TextSize = 12
                     label.TextColor3 = Color3.fromRGB(200, 200, 200)
                     label.TextStrokeTransparency = 0
                     
                     local dist = math.floor((game.Players.LocalPlayer.Character.HumanoidRootPart.Position - root.Position).Magnitude)
                     label.Text = string.format("NPC: %s\n[%d m]", obj.Name, dist)
                  end
               end
            end
            task.wait(0.2)
         end
      end)
   end,
})

-- ================= TAB 2: COMBAT (HITBOX GLOW) =================
local CombatTab = Window:CreateTab("Combat", 4483362458)
_G.HeadSize = 5
_G.HitboxEnabled = false

CombatTab:CreateToggle({
   Name = "Hitbox",
   CurrentValue = false,
   Callback = function(Value)
      _G.HitboxEnabled = Value
      task.spawn(function()
         while _G.HitboxEnabled do
            for _, p in pairs(game.Players:GetPlayers()) do
               if p ~= game.Players.LocalPlayer and p.Character and p.Character:FindFirstChild("Head") then
                  local h = p.Character.Head
                  h.Size = Vector3.new(_G.HeadSize, _G.HeadSize, _G.HeadSize)
                  h.Transparency = 0.7
                  h.CanCollide = false
                  
                  if not h:FindFirstChild("Glow") then
                     local high = Instance.new("Highlight", h)
                     high.Name = "Glow"
                     high.FillColor = Color3.new(1, 0, 0)
                     high.FillTransparency = 0.5
                     high.OutlineColor = Color3.new(1, 1, 1)
                     high.OutlineTransparency = 0
                     high.Adornee = h
                  end
               end
            end
            task.wait(0.5)
         end
         if not _G.HitboxEnabled then
            for _, p in pairs(game.Players:GetPlayers()) do
               if p.Character and p.Character:FindFirstChild("Head") then
                  p.Character.Head.Size = Vector3.new(1.2, 1.2, 1.2)
                  p.Character.Head.Transparency = 0
                  if p.Character.Head:FindFirstChild("Glow") then p.Character.Head.Glow:Destroy() end
               end
            end
         end
      end)
   end,
})

CombatTab:CreateSlider({
   Name = "Hitbox Size",
   Range = {1, 15},
   Increment = 0.5,
   CurrentValue = 5,
   Callback = function(v) _G.HeadSize = v end,
})
