<?php

// Affiche les erreurs pour le débogage, à commenter en production
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Configuration du journal d'erreurs
ini_set('log_errors', 1);
ini_set('error_log', './php_errors.log');

// Inclure l'autoloader de Composer (pour Stripe et Dotenv)
require __DIR__ . '/vendor/autoload.php';

// Démarrer la mise en mémoire tampon pour éviter les sorties prématurées
ob_start();

// S'assurer que le script répond en JSON
header('Content-Type: application/json; charset=utf-8');

// Charger les variables d'environnement (contient la clé Stripe)
try {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
} catch (Exception $e) {
    error_log('Erreur .env: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Erreur de configuration serveur.']);
    exit;
}

// Configurer la clé secrète Stripe
$stripeSecretKey = $_ENV['STRIPE_SECRET_KEY'] ?? '';
\Stripe\Stripe::setApiKey($stripeSecretKey);

// Début du traitement principal
try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Méthode de requête non autorisée.');
    }

    // --- 1. Récupération et validation des données du formulaire ---
    $name = trim($_POST['name'] ?? '');
    $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $phone = trim($_POST['phone'] ?? '');
    $user_type = $_POST['user-type'] ?? 'personal';
    $company = trim($_POST['company'] ?? '');
    
    // Récupération des données du panier envoyées en JSON par le frontend
    $cart_json = $_POST['cart'] ?? '[]';
    $cart = json_decode($cart_json, true);

    if (json_last_error() !== JSON_ERROR_NONE || !is_array($cart)) {
        throw new Exception('Les données du panier sont invalides.');
    }
    
    // Validation des champs essentiels
    if (empty($name) || !$email || empty($phone)) {
        throw new Exception('Nom, email valide et téléphone sont requis.');
    }

    // --- 2. Traitement des images et du récapitulatif ---

    // Sauvegarde les images (Data URI) du panier en tant que fichiers et prépare les pièces jointes
    $attachments = saveDataUrisAsFiles($cart);
    
    // Calcule les totaux et prépare le récapitulatif de la commande
    $orderSummary = processOrderData($cart);
    $total_amount = $orderSummary['total_with_vat'];


    // --- 3. Logique de paiement (uniquement pour les particuliers) ---
    $payment_status = 'quote_requested'; // Statut par défaut (pour les pros)
    
    if ($user_type === 'personal') {
        $stripe_payment_method_id = $_POST['payment_method_id'] ?? null;
        if (empty($stripe_payment_method_id)) {
            // NOTE: Si c'est juste une demande de devis, on ne lance pas d'exception pour le paiement manquant
            // throw new Exception('Moyen de paiement non fourni pour une commande personnelle.');
            $payment_status = 'En attente (Devis)';
        } else {
            // Création du client Stripe
            $customer = \Stripe\Customer::create(['email' => $email, 'name' => $name]);

            // Création de l'intention de paiement
            $paymentIntent = \Stripe\PaymentIntent::create([
                'amount' => $total_amount * 100, // Montant en centimes
                'currency' => 'eur',
                'customer' => $customer->id,
                'payment_method' => $stripe_payment_method_id,
                'off_session' => true,
                'confirm' => true,
                'description' => 'Commande Signeedclub - ' . $name,
            ]);
            
            // Vérification du statut du paiement
            if ($paymentIntent->status === 'succeeded') {
                $payment_status = 'Paiement par carte réussi';
            } elseif ($paymentIntent->status === 'processing') {
                $payment_status = 'Prélèvement SEPA initié';
            } else {
                 throw new Exception('Le paiement a échoué. Statut : ' . $paymentIntent->status);
            }
        }
    }

    // --- 4. Envoi des e-mails ---
    $emailData = array_merge($_POST, [
        'order_summary' => $orderSummary,
        'attachments_meta' => $attachments, // métadonnées pour le corps de l'email
        'payment_status' => $payment_status
    ]);
    
    $emailHtmlContent = generateEmailContent($emailData);

    // Envoi de l'e-mail au propriétaire du site
    $admin_subject = ($user_type === 'professional' ? 'Nouvelle Demande de Devis' : 'Nouvelle Commande Payée') . ' - ' . $name;
    sendEmailWithAttachments(
        'contact@signeedclub.com', // E-mail du destinataire (vous)
        $admin_subject,
        $emailHtmlContent,
        'contact@signeedclub.com', // E-mail de l'expéditeur
        $attachments // Fichiers à joindre
    );
    
    // Envoi d'un e-mail de confirmation au client
    $client_subject = $user_type === 'professional' ? 'Votre demande de devis chez Signeedclub' : 'Confirmation de votre commande Signeedclub';
    $clientEmailHtml = generateClientConfirmationEmail($emailData);
    sendEmailWithAttachments($email, $client_subject, $clientEmailHtml, 'contact@signeedclub.com', []);


    // --- 5. Sauvegarde et réponse ---
    saveOrderToFile(array_merge($emailData, ['files' => $attachments]));
    
    ob_clean();
    echo json_encode([
        'success' => true,
        'message' => 'Opération réussie !'
    ]);

} catch (\Stripe\Exception\ApiErrorException $e) {
    ob_clean();
    error_log('Erreur Stripe: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Erreur de paiement: ' . $e->getMessage()]);

} catch (Exception $e) {
    ob_clean();
    error_log('Erreur générale: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Erreur: ' . $e->getMessage()]);
}


/**
 * Fonctions de support
 */

function saveDataUrisAsFiles($cart) {
    $attachments = [];
    $uploadDir = './Uploads/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

    foreach ($cart as $index => $item) {
        // Liste des clés d'images à traiter
        $image_keys = ['previewImageUrlFront', 'previewImageUrlBack'];

        foreach ($image_keys as $key) {
            if (!empty($item[$key]) && strpos($item[$key], 'data:image') === 0) {
                
                // Extraction des données de l'image
                preg_match('/^data:image\/(.*?);base64,(.*)$/', $item[$key], $matches);
                if (count($matches) !== 3) continue;

                $extension = $matches[1]; // png, jpeg, etc.
                $base64_data = $matches[2];
                $imageData = base64_decode($base64_data);
                
                // Création d'un nom de fichier unique
                $filename = 'item' . $index . '_' . $key . '_' . date('Ymd-His') . '.' . $extension;
                $filepath = $uploadDir . $filename;
                
                file_put_contents($filepath, $imageData);
                
                $attachments[] = [
                    'path' => $filepath,
                    'name' => $filename,
                    'mime_type' => 'image/' . $extension,
                    'cid' => $filename // ID de contenu pour l'intégration dans l'e-mail
                ];
            }
        }
    }
    return $attachments;
}

function processOrderData($cart) {
    $summary = ['items' => [], 'total_items' => 0, 'subtotal' => 0];
    $productDatabase = [
        'tshirt' => ['name' => 'T-shirt', 'price' => 12],
        'hoodie' => ['name' => 'Sweat capuche', 'price' => 27],
        'hoodie_jhk422' => ['name' => 'Gilet capuche', 'price' => 28],
        'polo' => ['name' => 'Polo', 'price' => 22],
        'casquette' => ['name' => 'Casquette', 'price' => 15],
    ];

    foreach ($cart as $item) {
        $product = $productDatabase[$item['productType']] ?? ['name' => 'Produit Inconnu', 'price' => 0];
        $itemTotalQuantity = 0;
        $itemTotalPrice = 0;

        foreach ($item['sizes'] as $quantity) {
            $itemTotalQuantity += $quantity;
        }
        $itemTotalPrice = $itemTotalQuantity * $product['price'];

        if ($itemTotalQuantity > 0) {
            $summary['items'][] = [
                'name' => $product['name'],
                'color' => $item['color'],
                'sizes' => $item['sizes'],
                'quantity' => $itemTotalQuantity,
                'price' => $itemTotalPrice,
            ];
            $summary['total_items'] += $itemTotalQuantity;
            $summary['subtotal'] += $itemTotalPrice;
        }
    }

    $summary['vat'] = $summary['subtotal'] * 0.21;
    $summary['total_with_vat'] = $summary['subtotal'] + $summary['vat'];
    return $summary;
}


function sendEmailWithAttachments($to, $subject, $htmlMessage, $from, $attachments) {
    $boundary = md5(uniqid(time()));
    
    $headers = "From: Signeedclub <" . $from . ">\r\n";
    $headers .= "Reply-To: " . $from . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/related; boundary=\"$boundary\"\r\n";

    $message = "--$boundary\r\n";
    $message .= "Content-Type: text/html; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $message .= $htmlMessage . "\r\n\r\n";

    foreach ($attachments as $att) {
        if (file_exists($att['path'])) {
            $fileContent = file_get_contents($att['path']);
            $fileContentEncoded = chunk_split(base64_encode($fileContent));

            $message .= "--$boundary\r\n";
            $message .= "Content-Type: " . $att['mime_type'] . "; name=\"" . $att['name'] . "\"\r\n";
            $message .= "Content-Transfer-Encoding: base64\r\n";
            $message .= "Content-Disposition: attachment; filename=\"" . $att['name'] . "\"\r\n";
            $message .= "Content-ID: <" . $att['cid'] . ">\r\n\r\n";
            $message .= $fileContentEncoded . "\r\n";
        }
    }
    
    $message .= "--$boundary--";
    return mail($to, $subject, $message, $headers);
}


function generateEmailContent($data) {
    $summary = $data['order_summary'];
    $html = '<!DOCTYPE html><html><body>';
    $html .= "<h1>" . ($data['user-type'] === 'professional' ? 'Nouvelle Demande de Devis' : 'Nouvelle Commande') . "</h1>";
    $html .= "<h2>Infos Client</h2>";
    $html .= "<p><strong>Nom:</strong> " . htmlspecialchars($data['name']) . "</p>";
    $html .= "<p><strong>Email:</strong> " . htmlspecialchars($data['email']) . "</p>";
    $html .= "<p><strong>Téléphone:</strong> " . htmlspecialchars($data['phone']) . "</p>";
    if ($data['user-type'] === 'professional') {
        $html .= "<p><strong>Société:</strong> " . htmlspecialchars($data['company']) . "</p>";
    }
     $html .= "<p><strong>Statut Paiement:</strong> " . htmlspecialchars($data['payment_status']) . "</p>";

    $html .= "<h2>Récapitulatif</h2>";
    foreach ($summary['items'] as $item) {
        $html .= "<div>";
        $html .= "<h3>" . htmlspecialchars($item['name']) . " - Couleur: " . htmlspecialchars($item['color']) . "</h3>";
        $html .= "<ul>";
        foreach ($item['sizes'] as $size => $qty) {
            if ($qty > 0) $html .= "<li>Taille " . htmlspecialchars($size) . ": " . $qty . "</li>";
        }
        $html .= "</ul>";
        $html .= "<p>Total article: " . $item['quantity'] . " pièces pour " . number_format($item['price'], 2) . " €</p>";
        $html .= "</div><hr>";
    }

    $html .= "<h3>Total HT: " . number_format($summary['subtotal'], 2) . " €</h3>";
    $html .= "<h3>TVA (21%): " . number_format($summary['vat'], 2) . " €</h3>";
    $html .= "<h2>Total TTC: " . number_format($summary['total_with_vat'], 2) . " €</h2>";

    if (!empty($data['message'])) {
        $html .= "<h2>Message du client:</h2><p>" . nl2br(htmlspecialchars($data['message'])) . "</p>";
    }
    
    if(!empty($data['attachments_meta'])) {
        $html .= "<h2>Fichiers Joints :</h2><ul>";
        foreach($data['attachments_meta'] as $att) {
            $html .= "<li>" . htmlspecialchars($att['name']) . "</li>";
        }
        $html .= "</ul>";
        // Optionnel : Intégrer les images directement dans l'email
        foreach($data['attachments_meta'] as $att) {
             $html .= "<p>" . htmlspecialchars($att['name']) . ":<br><img src='cid:" . $att['cid'] . "' style='max-width: 200px; border: 1px solid #ccc;'/></p>";
        }
    }


    $html .= '</body></html>';
    return $html;
}

function generateClientConfirmationEmail($data) {
    // Vous pouvez créer un template HTML différent et plus simple pour le client ici
    $summary = $data['order_summary'];
    $html = '<!DOCTYPE html><html><body>';
    $html .= "<h1>Merci pour votre " . ($data['user-type'] === 'professional' ? 'demande de devis' : 'commande') . " !</h1>";
    $html .= "<p>Bonjour " . htmlspecialchars($data['name']) . ",</p>";
    $html .= "<p>Nous avons bien reçu votre demande et nous vous en remercions. Voici un récapitulatif :</p>";
    
    // (Ajouter ici le même genre de récapitulatif que dans generateEmailContent)
    $html .= "<h2>Récapitulatif</h2>";
    foreach ($summary['items'] as $item) {
        $html .= "<div>";
        $html .= "<h3>" . htmlspecialchars($item['name']) . " - Couleur: " . htmlspecialchars($item['color']) . "</h3>";
        $html .= "<ul>";
        foreach ($item['sizes'] as $size => $qty) {
            if ($qty > 0) $html .= "<li>Taille " . htmlspecialchars($size) . ": " . $qty . "</li>";
        }
        $html .= "</ul>";
        $html .= "<p>Total article: " . $item['quantity'] . " pièces pour " . number_format($item['price'], 2) . " €</p>";
        $html .= "</div><hr>";
    }
    
    $html .= "<h2>Total TTC: " . number_format($summary['total_with_vat'], 2) . " €</h2>";
    
    $html .= "<p>Nous reviendrons vers vous très prochainement.</p>";
    $html .= "<p>L'équipe Signeedclub</p>";
    $html .= '</body></html>';
    return $html;
}


function saveOrderToFile($orderData) {
    $ordersDir = './orders/';
    if (!is_dir($ordersDir)) mkdir($ordersDir, 0755, true);
    $filename = $ordersDir . 'order_' . date('Ymd_His') . '.json';
    file_put_contents($filename, json_encode($orderData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}
