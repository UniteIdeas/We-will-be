<?php

$servername = 'localhost';
$username = 'root';
$password = 'root';
$dbname = 'wsd2015';

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

if( isset($_GET['command'] ) ) {
    
    $command = $_GET['command'];
    
    if( $command == 'SeriesList' ) {
        $sql = 'SELECT DISTINCT SeriesRowId,SeriesName,TargetName,GoalName FROM wsd2015';
    }
    if( $command == 'SeriesData' ) {
        $sql = 'SELECT CountryId,CountryName,IsDeveloped,Year,Value FROM wsd2015 WHERE SeriesRowId=' . $_GET['SeriesRowId'];
    }
    
}

$result = $conn->query($sql);
if ($result->num_rows > 0) {
    $rows = array();
    while($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    print json_encode( $rows );
} else {
    echo json_encode( array() );
}

$conn->close();
die();
