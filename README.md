# 🚗 Carpool Rewards: Tokenized Incentives for Urban Mobility

Welcome to Carpool Rewards, a Web3 platform built on the Stacks blockchain that incentivizes carpooling to reduce urban traffic congestion! By rewarding users with fungible tokens for verified shared rides, this project encourages fewer single-occupancy vehicles on the road, leading to less pollution, shorter commute times, and more sustainable cities.

## ✨ Features

🚀 Register as a driver or passenger with secure on-chain profiles  
🔗 Post ride offers or requests with details like route, time, and seats available  
🤝 Automated matching of passengers to drivers based on location and preferences  
✅ Oracle-based verification of completed carpools to prevent fraud  
💰 Earn reward tokens (CRP) for successful rides, proportional to distance and congestion reduction impact  
📊 Governance voting for token holders to adjust reward rates and rules  
⚖️ Dispute resolution for contested trips  
🌍 Integration with real-world data oracles for urban congestion metrics  

## 🛠 How It Works

**For Drivers**  
- Register your profile and vehicle details  
- Post a ride offer with pickup/dropoff points, schedule, and available seats  
- Get matched with passengers and confirm the group  
- Complete the trip and submit verification (e.g., via GPS oracle or passenger confirmations)  
- Receive CRP tokens based on the ride's impact (e.g., higher rewards in high-congestion areas)  

**For Passengers**  
- Register and browse available ride offers  
- Request to join a ride that matches your route  
- Confirm participation and complete the trip  
- Verify the ride's success to trigger rewards for all participants  

**Token Economy**  
- CRP tokens are minted upon verified rides and can be staked for governance or redeemed for perks like toll discounts or partner services  
- The system uses congestion data from oracles to scale rewards—busier cities mean bigger incentives!  

**Smart Contracts Overview**  
This project involves 8 Clarity smart contracts for a robust, decentralized implementation:  
1. **UserRegistry.clar**: Handles user registration, roles (driver/passenger), and profile updates.  
2. **RideOffer.clar**: Allows drivers to create and manage ride offers with metadata like routes and capacity.  
3. **RideRequest.clar**: Enables passengers to submit and match ride requests.  
4. **MatchingEngine.clar**: Automates pairing of offers and requests using on-chain logic.  
5. **TripVerification.clar**: Integrates with oracles to confirm trip completion and calculate congestion impact.  
6. **TokenIncentive.clar**: Manages the CRP fungible token (SIP-10 compliant) for minting and distributing rewards.  
7. **Governance.clar**: DAO-style voting for token holders to update parameters like reward multipliers.  
8. **DisputeResolution.clar**: Multisig-based system for resolving disputes over failed or fraudulent rides.  

Boom! Start carpooling, earn tokens, and help decongest your city—all secured on the blockchain.