# Cost Protection & Billing Alerts Setup

## ✅ What's Already Deployed

Your infrastructure now includes:

### 1. CloudWatch Billing Alarm
- **Threshold**: $40 USD (80% of your $50 budget)
- **Frequency**: Checks every 6 hours
- **Status**: ⚠️ Needs email subscription (see below)

### 2. Lambda Throttle Alarm
- **Monitors**: Chat Lambda throttling events
- **Threshold**: Alerts if >10 throttles in 5 minutes
- **Status**: ⚠️ Needs email subscription (see below)

### 3. SNS Topic for Alerts
- **Topic ARN**: `arn:aws:sns:us-east-1:975150127262:claypalumbo-portfolio-billing-alerts`
- **Status**: ⚠️ Needs email subscription

---

## 📧 Step 1: Subscribe Your Email to Billing Alerts

Run this command with YOUR email address:

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:975150127262:claypalumbo-portfolio-billing-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com
```

**Then**: Check your email and confirm the subscription!

---

## 💰 Step 2: Set Up AWS Budget ($50/month)

### Option A: AWS Console (Recommended)
1. Go to [AWS Billing Console → Budgets](https://console.aws.amazon.com/billing/home#/budgets)
2. Click "Create budget"
3. Select "Cost budget - Monthly"
4. Set amount: **$50**
5. Configure alerts:
   - Alert at 80% ($40) - sends to your email
   - Alert at 100% ($50) - sends to your email
   - Optional: Alert at 50% ($25) for early warning
6. Click "Create budget"

### Option B: AWS CLI
```bash
# Create budget configuration file
cat > /tmp/budget.json << 'EOF'
{
  "BudgetName": "ClayPalumboMonthlyBudget",
  "BudgetLimit": {
    "Amount": "50",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
EOF

# Create notifications configuration
cat > /tmp/notifications.json << 'EOF'
[
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "your-email@example.com"
      }
    ]
  },
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 100,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "your-email@example.com"
      }
    ]
  }
]
EOF

# Create the budget
aws budgets create-budget \
  --account-id 975150127262 \
  --budget file:///tmp/budget.json \
  --notifications-with-subscribers file:///tmp/notifications.json
```

---

## 📊 Step 3: Monitor Your Costs

### View Current Spending
```bash
# Get current month's estimated charges
aws cloudwatch get-metric-statistics \
  --namespace AWS/Billing \
  --metric-name EstimatedCharges \
  --dimensions Name=Currency,Value=USD \
  --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Maximum
```

### Check Alarm Status
```bash
aws cloudwatch describe-alarms --alarm-names ClayPalumboPortfolio-BillingAlert-40USD
```

---

## 🛡️ Current Cost Protection Summary

| Protection | Status | Details |
|-----------|--------|---------|
| **CloudWatch Billing Alarm** | ✅ Active | Alerts at $40 |
| **Lambda Throttle Alarm** | ✅ Active | Alerts on excessive throttling |
| **Email Notifications** | ⚠️ Setup Required | Subscribe your email |
| **AWS Budget** | ⚠️ Setup Required | Create $50/month budget |

---

## 💡 Cost Optimization Tips

1. **Bedrock is the main cost driver**
   - Each chat costs ~$0.01-0.03 depending on length
   - Knowledge Base retrievals: ~$0.002 per query
   - Guardrails (Nova Pro): ~$0.001 per check

2. **Monitor your usage**
   - Check billing dashboard weekly
   - Set up budget alerts at 50%, 80%, and 100%

3. **If costs spike**
   - Check CloudWatch Logs for unusual activity
   - Temporarily disable the site if needed
   - Check for bot traffic in CloudFront metrics

4. **Free tier eligible services** (12 months):
   - Lambda: 1M requests/month
   - CloudFront: 1TB data transfer
   - S3: 5GB storage
   - CloudWatch: 10 custom metrics

---

## 🚨 What Happens When You Hit $40?

1. You receive an email alert
2. Review CloudWatch metrics to identify the cost source
3. Optionally:
   - Reduce Knowledge Base queries
   - Switch to a cheaper model (e.g., Claude Haiku)
   - Temporarily disable chat feature

---

## ✅ Quick Start Checklist

- [ ] Subscribe email to SNS topic (Step 1)
- [ ] Confirm email subscription
- [ ] Create AWS Budget for $50/month (Step 2)
- [ ] Test alerts by checking alarm state
- [ ] Set calendar reminder to check costs weekly

---

## 📞 Need Help?

- **AWS Budgets**: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create.html
- **CloudWatch Alarms**: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html
- **SNS Subscriptions**: https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html
